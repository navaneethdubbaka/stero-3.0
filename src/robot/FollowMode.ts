import { TrackingEngine } from '../vision/TrackingEngine';
import { useTrackingStore } from '../store/useTrackingStore';
import { useRobotStore } from '../store/useRobotStore';
import { useFollowStore, FollowStatus } from '../store/useFollowStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { RobotController } from './RobotController';
import {
  computeFollowCommand,
  computeFollowDiff,
  slewPwm,
  type FollowDiffCommand,
} from './NavigationEngine';
import type { MovementDirection } from './types';
import type { TrackingSnapshot } from '../vision/types';

/** Default max continuous spin before forced stop (overridable via settings). */
export const ANTI_SPIN_MS = 2500;

/** Follow tick rate (pose-event + interval). */
const TICK_HZ = 18;

/** Max absolute PWM change per wheel per tick. */
const SLEW_STEP = 32;

/** Search-on-lost rotate budget; then wait. */
export const SEARCH_BUDGET_MS = 4000;

export type FollowStartBlock = 'battery' | 'companion' | 'dispatch' | null;

/**
 * Closed-loop human following: tracking snapshot → FOLLOW claimant.
 * Yields to MANUAL / WEB / EMERGENCY via MotorArbiter priority.
 * Protocol v2.1 differential when useDifferentialDrive is on.
 */
class FollowModeImpl {
  private enabled = false;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private unsubTracking: (() => void) | null = null;
  private unsubConnected: (() => void) | null = null;
  private unsubEmergency: (() => void) | null = null;
  private rotateStartedAt: number | null = null;
  private antiSpinLatched = false;
  private lastCommand: MovementDirection = 'S';
  private slewedLeft = 0;
  private slewedRight = 0;
  private lastStartBlock: FollowStartBlock = null;
  private searchStartedAt: number | null = null;
  private searchDir: MovementDirection = 'L';

  isEnabled(): boolean {
    return this.enabled;
  }

  getLastStartBlock(): FollowStartBlock {
    return this.lastStartBlock;
  }

  start(): boolean {
    if (this.enabled) {
      this.tick();
      this.lastStartBlock = null;
      return true;
    }

    const { getDeviceHealth } = require('../utils/deviceHealth');
    const health = getDeviceHealth();
    if (health.lowBattery) {
      this.lastStartBlock = 'battery';
      console.log('[FollowMode] start blocked — low battery');
      try {
        const { useEmotionStore } = require('../store/useEmotionStore');
        useEmotionStore.getState().setEmotion('LOW_BATTERY');
      } catch {
        // ignore
      }
      return false;
    }

    // Companion arbitration: reject FOLLOW while SLEEP / MANUAL / DANCING / INTERRUPTED
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { CompanionStateMachine } = require('./CompanionStateMachine');
    if (!CompanionStateMachine.canFollow()) {
      this.lastStartBlock = 'companion';
      console.log(
        `[FollowMode] start blocked — companion=${CompanionStateMachine.getState()}`
      );
      return false;
    }
    const claim = CompanionStateMachine.dispatch('FOLLOW_START');
    if (!claim.ok) {
      this.lastStartBlock = 'dispatch';
      console.log(`[FollowMode] FOLLOW_START rejected: ${claim.reason}`);
      return false;
    }

    this.lastStartBlock = null;
    this.enabled = true;
    this.antiSpinLatched = false;
    this.rotateStartedAt = null;
    this.searchStartedAt = null;
    this.searchDir = 'L';
    this.lastCommand = 'S';
    this.slewedLeft = 0;
    this.slewedRight = 0;

    TrackingEngine.lockNearestCenter();

    // Lazy require avoids cycle with SleepSystem (which may stop Follow)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SleepSystem = require('../services/SleepSystem').default;
    SleepSystem.reportActivity();

    this.unsubTracking = TrackingEngine.subscribe(() => {
      this.tick();
    });

    this.tickInterval = setInterval(() => this.tick(), 1000 / TICK_HZ);

    let prevEstop = useRobotStore.getState().emergencyActive;
    this.unsubEmergency = useRobotStore.subscribe((state) => {
      if (!prevEstop && state.emergencyActive && this.enabled) {
        console.log('[FollowMode] E-stop — stopping follow');
        this.stop();
      }
      prevEstop = state.emergencyActive;
    });

    let prevConnected = useRobotStore.getState().isConnected;
    this.unsubConnected = useRobotStore.subscribe((state) => {
      if (prevConnected && !state.isConnected && this.enabled) {
        console.log('[FollowMode] USB disconnected — stopping follow');
        this.stop();
      }
      prevConnected = state.isConnected;
    });

    this.mirrorStatus();
    this.tick();
    console.log('[FollowMode] started');
    return true;
  }

  stop(): void {
    if (!this.enabled && !this.tickInterval) {
      useFollowStore.getState().reset();
      return;
    }

    this.enabled = false;
    this.clearTimers();
    this.antiSpinLatched = false;
    this.rotateStartedAt = null;
    this.searchStartedAt = null;
    this.lastCommand = 'S';
    this.slewedLeft = 0;
    this.slewedRight = 0;
    RobotController.requestFollowDrive('S');
    useFollowStore.getState().reset();
    TrackingEngine.clearLock();

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { CompanionStateMachine } = require('./CompanionStateMachine');
      CompanionStateMachine.dispatch('FOLLOW_STOP');
    } catch (e) {
      console.warn('[FollowMode] companion FOLLOW_STOP failed', e);
    }

    console.log('[FollowMode] stopped');
  }

  private clearTimers(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.unsubTracking) {
      this.unsubTracking();
      this.unsubTracking = null;
    }
    if (this.unsubConnected) {
      this.unsubConnected();
      this.unsubConnected = null;
    }
    if (this.unsubEmergency) {
      this.unsubEmergency();
      this.unsubEmergency = null;
    }
  }

  private tick(): void {
    if (!this.enabled) {
      return;
    }

    const snapshot = this.readSnapshot();
    if (!snapshot.lockedTrackId && (snapshot.people?.length ?? 0) > 0) {
      TrackingEngine.lockNearestCenter();
    }

    const snap = this.readSnapshot();
    const useDiff = RobotController.getUseDifferentialDrive();

    if (!snap.targetLocked) {
      this.tickSearch(snap, useDiff);
      return;
    }
    this.searchStartedAt = null;

    if (useDiff) {
      this.tickDifferential(snap);
    } else {
      this.tickDiscrete(snap);
    }
  }

  private tickSearch(snapshot: TrackingSnapshot, useDiff: boolean): void {
    const robot = useSettingsStore.getState().robot;
    const policy = robot.searchOnLost ?? 'wait';
    if (policy === 'off') {
      this.stop();
      return;
    }

    const now = Date.now();
    if (this.searchStartedAt === null) {
      this.searchStartedAt = now;
      this.searchDir = snapshot.offset < 0 ? 'L' : 'R';
    }
    const elapsed = now - this.searchStartedAt;
    const maxBurst = robot.maxRotateBurstMs ?? ANTI_SPIN_MS;
    const rotateCap = Math.min(SEARCH_BUDGET_MS, maxBurst);
    const rotateAllowed = policy === 'rotate' && elapsed < rotateCap;

    if (!rotateAllowed) {
      this.lastCommand = 'S';
      this.slewedLeft = 0;
      this.slewedRight = 0;
      if (useDiff) {
        RobotController.requestFollowDiff(0, 0);
      } else {
        RobotController.requestFollowDrive('S');
      }
      this.mirrorStatus(snapshot, 'S');
      return;
    }

    const dir: MovementDirection =
      Math.floor(elapsed / 700) % 2 === 0 ? this.searchDir : this.searchDir === 'L' ? 'R' : 'L';
    this.lastCommand = dir;
    if (useDiff) {
      const pwm = Math.max(40, robot.followMinPwm ?? 80);
      if (dir === 'L') {
        this.slewedLeft = -pwm;
        this.slewedRight = pwm;
      } else {
        this.slewedLeft = pwm;
        this.slewedRight = -pwm;
      }
      RobotController.requestFollowDiff(this.slewedLeft, this.slewedRight);
    } else {
      this.slewedLeft = 0;
      this.slewedRight = 0;
      RobotController.requestFollowDrive(dir);
    }
    this.mirrorStatus(snapshot, dir);
  }

  private tickDiscrete(snapshot: TrackingSnapshot): void {
    let command = computeFollowCommand(snapshot);
    command = this.applyAntiSpinDiscrete(snapshot, command);

    this.lastCommand = command;
    this.slewedLeft = 0;
    this.slewedRight = 0;

    RobotController.requestFollowDrive(command);
    this.mirrorStatus(snapshot, command);
  }

  private tickDifferential(snapshot: TrackingSnapshot): void {
    const robot = useSettingsStore.getState().robot;
    const maxBurst = robot.maxRotateBurstMs ?? ANTI_SPIN_MS;
    const motorCap = Math.min(robot.motorSpeed, robot.followMaxPwm ?? 180);

    let target: FollowDiffCommand = computeFollowDiff(snapshot, {
      followMinPwm: robot.followMinPwm ?? 80,
      followMaxPwm: motorCap,
      curveGain: robot.curveGain ?? 1.0,
    });

    target = this.applyAntiSpinDiff(snapshot, target, maxBurst);

    // CLOSE / stop: jump to zero for shin safety; otherwise slew
    if (target.mode === 'stop') {
      this.slewedLeft = 0;
      this.slewedRight = 0;
    } else {
      this.slewedLeft = slewPwm(this.slewedLeft, target.left, SLEW_STEP);
      this.slewedRight = slewPwm(this.slewedRight, target.right, SLEW_STEP);
    }

    this.lastCommand = this.diffApproxDirection(
      this.slewedLeft,
      this.slewedRight,
      target.mode
    );

    RobotController.requestFollowDiff(this.slewedLeft, this.slewedRight);
    this.mirrorStatus(snapshot, this.lastCommand);
  }

  private diffApproxDirection(
    left: number,
    right: number,
    mode: FollowDiffCommand['mode']
  ): MovementDirection {
    if (mode === 'stop' || (left === 0 && right === 0)) return 'S';
    if (mode === 'spin') {
      return left < 0 ? 'L' : 'R';
    }
    return 'F';
  }

  private readSnapshot(): TrackingSnapshot {
    const s = useTrackingStore.getState();
    return {
      personFound: s.personFound,
      targetLocked: s.targetLocked,
      offset: s.offset,
      shoulderWidth: s.shoulderWidth,
      distanceZone: s.distanceZone,
      landmarks: s.landmarks,
      confidence: s.confidence,
      deadband: s.deadband,
      steerZone: s.steerZone,
      estimatedDistanceM: s.estimatedDistanceM,
      distanceIntent: s.distanceIntent,
      lostMs: s.lostMs,
      error: s.error,
      lastUpdatedAt: s.lastUpdatedAt,
      people: s.people ?? [],
      lockedTrackId: s.lockedTrackId ?? null,
    };
  }

  private applyAntiSpinDiscrete(
    snapshot: TrackingSnapshot,
    command: MovementDirection
  ): MovementDirection {
    const maxBurst =
      useSettingsStore.getState().robot.maxRotateBurstMs ?? ANTI_SPIN_MS;
    const now = Date.now();
    const isRotate = command === 'L' || command === 'R';

    if (!snapshot.targetLocked || snapshot.steerZone === 'CENTER') {
      this.antiSpinLatched = false;
      this.rotateStartedAt = null;
      return command;
    }

    if (this.antiSpinLatched) {
      return 'S';
    }

    if (isRotate) {
      if (this.rotateStartedAt === null) {
        this.rotateStartedAt = now;
      } else if (now - this.rotateStartedAt >= maxBurst) {
        this.antiSpinLatched = true;
        this.rotateStartedAt = null;
        return 'S';
      }
    } else {
      this.rotateStartedAt = null;
    }

    return command;
  }

  private applyAntiSpinDiff(
    snapshot: TrackingSnapshot,
    target: FollowDiffCommand,
    maxBurstMs: number
  ): FollowDiffCommand {
    const now = Date.now();
    const isSpin = target.mode === 'spin';

    if (!snapshot.targetLocked || target.mode === 'curve' || target.mode === 'stop') {
      if (target.mode !== 'spin') {
        this.antiSpinLatched = false;
        this.rotateStartedAt = null;
      }
      if (!isSpin) {
        return target;
      }
    }

    if (this.antiSpinLatched) {
      return { left: 0, right: 0, mode: 'stop' };
    }

    if (isSpin) {
      if (this.rotateStartedAt === null) {
        this.rotateStartedAt = now;
      } else if (now - this.rotateStartedAt >= maxBurstMs) {
        this.antiSpinLatched = true;
        this.rotateStartedAt = null;
        return { left: 0, right: 0, mode: 'stop' };
      }
    } else {
      this.rotateStartedAt = null;
    }

    return target;
  }

  private mirrorStatus(
    snapshot?: TrackingSnapshot,
    command?: MovementDirection
  ): void {
    if (!this.enabled) {
      useFollowStore.getState().mirror({
        enabled: false,
        status: 'OFF',
        lastCommand: 'S',
      });
      return;
    }

    const snap = snapshot ?? this.readSnapshot();
    const cmd = command ?? this.lastCommand;
    let status: FollowStatus;

    if (!snap.targetLocked) {
      status = 'SEARCHING';
    } else if (cmd === 'S') {
      status = 'HOLD';
    } else {
      status = 'FOLLOWING';
    }

    useFollowStore.getState().mirror({
      enabled: true,
      status,
      lastCommand: cmd,
    });
  }
}

export const FollowMode = new FollowModeImpl();
