import { useRobotStore } from '../store/useRobotStore';
import { useEmotionStore, EmotionType } from '../store/useEmotionStore';
import { useDanceStore, DanceRoutineId, DanceStatus } from '../store/useDanceStore';
import { RobotController } from './RobotController';
import type { MovementDirection } from './types';

export type DanceStep = {
  tMs: number;
  direction: MovementDirection;
  emotion?: EmotionType;
  tts?: string;
};

export type DanceStartResult = { ok: boolean; reason?: string };

const ROUTINES: Record<DanceRoutineId, DanceStep[]> = {
  spin_happy: [
    { tMs: 0, direction: 'L', emotion: 'EXCITED' },
    { tMs: 400, direction: 'S' },
    { tMs: 550, direction: 'L' },
    { tMs: 950, direction: 'S' },
    { tMs: 1100, direction: 'L' },
    { tMs: 1500, direction: 'S' },
    { tMs: 1650, direction: 'L' },
    { tMs: 2050, direction: 'S' },
    { tMs: 2200, direction: 'L', emotion: 'JOY' },
    { tMs: 2600, direction: 'S' },
    { tMs: 2800, direction: 'R' },
    { tMs: 3200, direction: 'S' },
    { tMs: 3400, direction: 'L' },
    { tMs: 3800, direction: 'S' },
    { tMs: 4000, direction: 'R' },
    { tMs: 4400, direction: 'S' },
    { tMs: 4600, direction: 'L', emotion: 'EXCITED' },
    { tMs: 5000, direction: 'S' },
    { tMs: 5200, direction: 'F' },
    { tMs: 5450, direction: 'S' },
    { tMs: 5600, direction: 'B' },
    { tMs: 5850, direction: 'S' },
    { tMs: 6200, direction: 'S' },
  ],
  wiggle: [
    { tMs: 0, direction: 'L', emotion: 'JOY' },
    { tMs: 250, direction: 'S' },
    { tMs: 350, direction: 'R' },
    { tMs: 600, direction: 'S' },
    { tMs: 700, direction: 'L', emotion: 'EXCITED' },
    { tMs: 950, direction: 'S' },
    { tMs: 1050, direction: 'R' },
    { tMs: 1300, direction: 'S' },
    { tMs: 1400, direction: 'L' },
    { tMs: 1650, direction: 'S' },
    { tMs: 1750, direction: 'R', emotion: 'JOY' },
    { tMs: 2000, direction: 'S' },
    { tMs: 2200, direction: 'F' },
    { tMs: 2450, direction: 'S' },
    { tMs: 2600, direction: 'B' },
    { tMs: 2850, direction: 'S' },
    { tMs: 3000, direction: 'L' },
    { tMs: 3250, direction: 'S' },
    { tMs: 3350, direction: 'R', emotion: 'EXCITED' },
    { tMs: 3600, direction: 'S' },
    { tMs: 3800, direction: 'L' },
    { tMs: 4050, direction: 'S' },
    { tMs: 4200, direction: 'R' },
    { tMs: 4450, direction: 'S' },
    { tMs: 4800, direction: 'S' },
  ],
};

const BLOCKED_STATES = new Set([
  'SLEEP',
  'MANUAL',
  'DANCING',
  'LISTENING',
  'THINKING',
  'SPEAKING',
  'ERROR',
  'INTERRUPTED',
]);

/**
 * Open-loop entertainment timelines under the DANCE motor claimant.
 * Yields to MANUAL / WEB / EMERGENCY via MotorArbiter priority.
 */
class DanceModeImpl {
  private enabled = false;
  private routineId: DanceRoutineId | null = null;
  private stepTimers: ReturnType<typeof setTimeout>[] = [];
  private unsubConnected: (() => void) | null = null;
  private unsubEmergency: (() => void) | null = null;
  private endTimer: ReturnType<typeof setTimeout> | null = null;

  isEnabled(): boolean {
    return this.enabled;
  }

  getRoutineId(): DanceRoutineId | null {
    return this.routineId;
  }

  start(routineId: DanceRoutineId = 'spin_happy'): DanceStartResult {
    if (this.enabled) {
      return { ok: false, reason: 'Already dancing.' };
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { CompanionStateMachine } = require('./CompanionStateMachine');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { FollowMode } = require('./FollowMode');

    let state = CompanionStateMachine.getState();
    if (state === 'FOLLOWING' || FollowMode.isEnabled()) {
      FollowMode.stop();
      state = CompanionStateMachine.getState();
    }

    if (BLOCKED_STATES.has(state)) {
      const reason = `Cannot dance while ${state}.`;
      console.log(`[DanceMode] start blocked — ${reason}`);
      return { ok: false, reason };
    }

    const claim = CompanionStateMachine.requestDanceStart();
    if (!claim.ok) {
      console.log(`[DanceMode] DANCE_START rejected: ${claim.reason}`);
      return { ok: false, reason: claim.reason ?? 'Dance start rejected.' };
    }

    this.enabled = true;
    this.routineId = routineId;
    this.mirror('PLAYING');

    // Lazy require — SleepSystem / Voice may stop Dance
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SleepSystem = require('../services/SleepSystem').default;
    SleepSystem.reportActivity();

    let prevConnected = useRobotStore.getState().isConnected;
    this.unsubConnected = useRobotStore.subscribe((s) => {
      if (prevConnected && !s.isConnected && this.enabled) {
        console.log('[DanceMode] USB disconnected — stopping dance');
        this.stop('usb');
      }
      prevConnected = s.isConnected;
    });

    let prevEstop = useRobotStore.getState().emergencyActive;
    this.unsubEmergency = useRobotStore.subscribe((s) => {
      if (!prevEstop && s.emergencyActive && this.enabled) {
        console.log('[DanceMode] E-stop — stopping dance');
        this.stop('estop');
      }
      prevEstop = s.emergencyActive;
    });

    const steps = ROUTINES[routineId] ?? ROUTINES.spin_happy;
    this.scheduleSteps(steps);

    // One short TTS on start (no audio assets)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const VoiceService = require('../voice/VoiceService').default;
      void VoiceService.speak("Let's dance!");
    } catch (e) {
      console.warn('[DanceMode] start TTS failed', e);
    }

    console.log(`[DanceMode] started routine=${routineId}`);
    return { ok: true };
  }

  stop(reason: string = 'stop'): void {
    if (!this.enabled && this.stepTimers.length === 0) {
      useDanceStore.getState().reset();
      return;
    }

    const wasPlaying = this.enabled;
    this.enabled = false;
    this.clearTimers();
    this.clearSubs();

    RobotController.claim('DANCE', { kind: 'discrete', direction: 'S' });
    RobotController.release('DANCE');

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { CompanionStateMachine } = require('./CompanionStateMachine');
      if (CompanionStateMachine.getState() === 'DANCING') {
        CompanionStateMachine.requestDanceEnd();
      }
    } catch (e) {
      console.warn('[DanceMode] companion DANCE_END failed', e);
    }

    const status: DanceStatus =
      reason === 'complete' ? 'OFF' : wasPlaying ? 'ABORT' : 'OFF';
    this.routineId = null;
    useDanceStore.getState().mirror({
      enabled: false,
      routineId: null,
      status,
    });

    console.log(`[DanceMode] stopped reason=${reason}`);
  }

  private scheduleSteps(steps: DanceStep[]): void {
    this.clearTimers();
    let lastT = 0;
    for (const step of steps) {
      lastT = Math.max(lastT, step.tMs);
      const timer = setTimeout(() => {
        if (!this.enabled) return;
        RobotController.claim('DANCE', {
          kind: 'discrete',
          direction: step.direction,
        });
        if (step.emotion) {
          useEmotionStore.getState().setEmotion(step.emotion);
        }
      }, step.tMs);
      this.stepTimers.push(timer);
    }

    this.endTimer = setTimeout(() => {
      if (!this.enabled) return;
      this.stop('complete');
    }, lastT + 50);
  }

  private clearTimers(): void {
    for (const t of this.stepTimers) {
      clearTimeout(t);
    }
    this.stepTimers = [];
    if (this.endTimer) {
      clearTimeout(this.endTimer);
      this.endTimer = null;
    }
  }

  private clearSubs(): void {
    if (this.unsubConnected) {
      this.unsubConnected();
      this.unsubConnected = null;
    }
    if (this.unsubEmergency) {
      this.unsubEmergency();
      this.unsubEmergency = null;
    }
  }

  private mirror(status: DanceStatus): void {
    useDanceStore.getState().mirror({
      enabled: this.enabled,
      routineId: this.routineId,
      status,
    });
  }
}

export const DanceMode = new DanceModeImpl();
export { ROUTINES as DANCE_ROUTINES };
