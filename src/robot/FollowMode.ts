import { TrackingEngine } from '../vision/TrackingEngine';
import { useTrackingStore } from '../store/useTrackingStore';
import { useRobotStore } from '../store/useRobotStore';
import { useFollowStore, FollowStatus } from '../store/useFollowStore';
import { RobotController } from './RobotController';
import { computeFollowCommand } from './NavigationEngine';
import type { MovementDirection } from './types';
import type { TrackingSnapshot } from '../vision/types';

/** Max continuous L/R before forced stop until CENTER or lock lost. */
export const ANTI_SPIN_MS = 2500;

/** Fallback tick rate when pose events are sparse. */
const TICK_HZ = 12;

/**
 * Closed-loop human following: tracking snapshot → FOLLOW claimant.
 * Yields to MANUAL / WEB / EMERGENCY via MotorArbiter priority.
 */
class FollowModeImpl {
  private enabled = false;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private unsubTracking: (() => void) | null = null;
  private unsubConnected: (() => void) | null = null;
  private rotateStartedAt: number | null = null;
  private antiSpinLatched = false;
  private lastCommand: MovementDirection = 'S';

  isEnabled(): boolean {
    return this.enabled;
  }

  start(): void {
    if (this.enabled) {
      this.tick();
      return;
    }
    this.enabled = true;
    this.antiSpinLatched = false;
    this.rotateStartedAt = null;
    this.lastCommand = 'S';

    // Lazy require avoids cycle with SleepSystem (which may stop Follow)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SleepSystem = require('../services/SleepSystem').default;
    SleepSystem.reportActivity();

    this.unsubTracking = TrackingEngine.subscribe(() => {
      this.tick();
    });

    this.tickInterval = setInterval(() => this.tick(), 1000 / TICK_HZ);

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
    this.lastCommand = 'S';
    RobotController.requestFollowDrive('S');
    useFollowStore.getState().reset();
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
  }

  private tick(): void {
    if (!this.enabled) {
      return;
    }

    const snapshot = this.readSnapshot();
    let command = computeFollowCommand(snapshot);
    command = this.applyAntiSpin(snapshot, command);

    this.lastCommand = command;

    if (command === 'S') {
      RobotController.requestFollowDrive('S');
    } else {
      RobotController.requestFollowDrive(command);
    }

    this.mirrorStatus(snapshot, command);
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
    };
  }

  private applyAntiSpin(
    snapshot: TrackingSnapshot,
    command: MovementDirection
  ): MovementDirection {
    const now = Date.now();
    const isRotate = command === 'L' || command === 'R';

    // Clear latch when centered or lock lost
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
      } else if (now - this.rotateStartedAt >= ANTI_SPIN_MS) {
        this.antiSpinLatched = true;
        this.rotateStartedAt = null;
        return 'S';
      }
    } else {
      this.rotateStartedAt = null;
    }

    return command;
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
