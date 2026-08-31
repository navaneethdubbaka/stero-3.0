import type { TrackingSnapshot } from '../vision/types';
import type { MovementDirection } from './types';

/**
 * Pure mapping from tracking snapshot → discrete motor command (Protocol v1).
 * Deadband / followDistance are already baked into steerZone + distanceIntent.
 */
export function computeFollowCommand(snapshot: TrackingSnapshot): MovementDirection {
  if (!snapshot.targetLocked) {
    return 'S';
  }

  if (snapshot.steerZone === 'LEFT') {
    return 'L';
  }
  if (snapshot.steerZone === 'RIGHT') {
    return 'R';
  }

  // CENTER
  if (
    snapshot.distanceIntent === 'TOO_CLOSE' ||
    snapshot.distanceZone === 'CLOSE'
  ) {
    return 'S';
  }

  if (snapshot.distanceIntent === 'HOLD') {
    return 'S';
  }

  // APPROACH (and not CLOSE)
  if (snapshot.distanceIntent === 'APPROACH') {
    return 'F';
  }

  return 'S';
}

export type FollowDiffMode = 'curve' | 'spin' | 'stop';

export type FollowDiffTunables = {
  followMinPwm: number;
  followMaxPwm: number;
  curveGain: number;
  /** Absolute offset beyond this → spin-in-place instead of curve. */
  spinOffset?: number;
};

export type FollowDiffCommand = {
  left: number;
  right: number;
  mode: FollowDiffMode;
};

const DEFAULT_SPIN_OFFSET = 0.45;

function clampPwm(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function clampSigned(value: number): number {
  return Math.max(-255, Math.min(255, Math.round(value)));
}

/**
 * Protocol v2.1 mapping: tracking → signed per-wheel PWM.
 * Positive = forward (same as F). Opposite signs = spin in place.
 */
export function computeFollowDiff(
  snapshot: TrackingSnapshot,
  tunables: FollowDiffTunables
): FollowDiffCommand {
  const minPwm = Math.max(0, Math.min(255, tunables.followMinPwm));
  const maxPwm = Math.max(minPwm, Math.min(255, tunables.followMaxPwm));
  const gain = Math.max(0.1, tunables.curveGain);
  const spinOffset =
    tunables.spinOffset ??
    Math.max(DEFAULT_SPIN_OFFSET, snapshot.deadband * 2.5);

  if (!snapshot.targetLocked) {
    return { left: 0, right: 0, mode: 'stop' };
  }

  if (
    snapshot.distanceIntent === 'TOO_CLOSE' ||
    snapshot.distanceZone === 'CLOSE'
  ) {
    return { left: 0, right: 0, mode: 'stop' };
  }

  if (snapshot.distanceIntent === 'HOLD') {
    return { left: 0, right: 0, mode: 'stop' };
  }

  const absOffset = Math.abs(snapshot.offset);

  // Far lateral: spin in place with opposite signed PWM
  if (absOffset > spinOffset) {
    const spinPwm = clampPwm(maxPwm * 0.75, minPwm, maxPwm);
    if (snapshot.offset < 0) {
      // Person on left → rotate left: left reverse, right forward
      return { left: -spinPwm, right: spinPwm, mode: 'spin' };
    }
    return { left: spinPwm, right: -spinPwm, mode: 'spin' };
  }

  // Base forward speed from distance zone
  let base =
    snapshot.distanceZone === 'FAR'
      ? maxPwm
      : clampPwm((minPwm + maxPwm) / 2, minPwm, maxPwm);

  if (snapshot.distanceIntent !== 'APPROACH') {
    return { left: 0, right: 0, mode: 'stop' };
  }

  // Within / near deadband: equal forward
  if (absOffset <= snapshot.deadband) {
    const pwm = clampPwm(base, minPwm, maxPwm);
    return { left: pwm, right: pwm, mode: 'curve' };
  }

  // Gentle curve: both forward, unequal PWM
  // Person left (offset < 0): left < right so we arc left
  const delta = clampPwm(absOffset * gain * (maxPwm - minPwm), 0, maxPwm - minPwm);
  let left = base;
  let right = base;
  if (snapshot.offset < 0) {
    left = base - delta;
    right = base + delta * 0.35;
  } else {
    right = base - delta;
    left = base + delta * 0.35;
  }

  left = clampPwm(left, minPwm, maxPwm);
  right = clampPwm(right, minPwm, maxPwm);

  return {
    left: clampSigned(left),
    right: clampSigned(right),
    mode: 'curve',
  };
}

/** Per-tick slew toward target PWM (signed). */
export function slewPwm(current: number, target: number, maxStep: number): number {
  const step = Math.max(1, maxStep);
  const d = target - current;
  if (d > step) return current + step;
  if (d < -step) return current - step;
  return target;
}
