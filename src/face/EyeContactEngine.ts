import { useTrackingStore } from '../store/useTrackingStore';

export type GazeVector = { x: number; y: number };

const LOCKED_LERP = 12;
const LOST_LERP = 8;
const NOSE_INDEX = 0;

/** Pure: map tracking offset (+ optional nose) → target gaze in [-1, 1]. */
export function computeTargetGazeX(
  offset: number,
  noseX: number | null
): number {
  let raw = offset * 2;
  if (noseX !== null && Number.isFinite(noseX)) {
    const noseOffset = noseX - 0.5;
    raw = 0.7 * offset * 2 + 0.3 * (noseOffset * 2);
  }
  return Math.max(-1, Math.min(1, raw));
}

/**
 * Maps tracking offset → smoothed gaze for pupil overlay.
 * Never drives motors.
 */
class EyeContactEngineImpl {
  private gazeX = 0;
  private gazeY = 0;
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.gazeX = 0;
      this.gazeY = 0;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getGaze(): GazeVector {
    return { x: this.gazeX, y: this.gazeY };
  }

  reset(): void {
    this.gazeX = 0;
    this.gazeY = 0;
  }

  /**
   * Advance smoothed gaze.
   * @param dtMs delta time in milliseconds
   */
  tick(dtMs: number): GazeVector {
    if (!this.enabled) {
      return this.getGaze();
    }

    const dt = Math.max(0, dtMs) / 1000;
    const snap = useTrackingStore.getState();

    let targetX = 0;
    if (snap.targetLocked) {
      const nose = snap.landmarks[NOSE_INDEX];
      const noseX =
        nose && typeof nose.x === 'number' ? nose.x : null;
      targetX = computeTargetGazeX(snap.offset, noseX);
    }

    const rate = snap.targetLocked ? LOCKED_LERP : LOST_LERP;
    const alpha = Math.min(1, dt * rate);
    this.gazeX += (targetX - this.gazeX) * alpha;
    this.gazeY = 0;

    // Snap tiny residuals to zero when unlocked
    if (!snap.targetLocked && Math.abs(this.gazeX) < 0.01) {
      this.gazeX = 0;
    }

    return this.getGaze();
  }

  /** Test helper: apply one tick with an injected snapshot-like target. */
  tickToward(targetX: number, locked: boolean, dtMs: number): number {
    const dt = Math.max(0, dtMs) / 1000;
    const rate = locked ? LOCKED_LERP : LOST_LERP;
    const alpha = Math.min(1, dt * rate);
    this.gazeX += (targetX - this.gazeX) * alpha;
    if (!locked && Math.abs(this.gazeX) < 0.01) {
      this.gazeX = 0;
    }
    return this.gazeX;
  }
}

export const EyeContactEngine = new EyeContactEngineImpl();
