import type { Landmark } from './VisionCameraView';
import type { DistanceIntent, SteerZone } from './types';
import {
  DISTANCE_INTENT_TOLERANCE_M,
  DISTANCE_MAX_M,
  DISTANCE_MIN_M,
  DISTANCE_SCALE_K,
  LEFT_SHOULDER_INDEX,
  RIGHT_SHOULDER_INDEX,
} from './types';

/**
 * deadband = 0.05 + (1 - trackingSensitivity) * 0.20
 * sensitivity 1.0 → 0.05; 0.5 → 0.15; 0.1 → 0.23
 */
export function computeDeadband(trackingSensitivity: number): number {
  const s = Math.max(0.1, Math.min(1.0, trackingSensitivity));
  return 0.05 + (1 - s) * 0.2;
}

export function computeSteerZone(offset: number, deadband: number): SteerZone {
  if (Math.abs(offset) <= deadband) {
    return 'CENTER';
  }
  return offset < -deadband ? 'LEFT' : 'RIGHT';
}

/**
 * Soft meter estimate from normalized shoulder width.
 * estimatedDistanceM = clamp(K / max(shoulderWidth, 0.01), MIN, MAX)
 */
export function estimateDistanceM(shoulderWidth: number): number {
  const w = Math.max(shoulderWidth, 0.01);
  const raw = DISTANCE_SCALE_K / w;
  return Math.max(DISTANCE_MIN_M, Math.min(DISTANCE_MAX_M, raw));
}

export function computeDistanceIntent(
  estimatedDistanceM: number,
  followDistanceM: number,
  toleranceM: number = DISTANCE_INTENT_TOLERANCE_M
): DistanceIntent {
  if (estimatedDistanceM > followDistanceM + toleranceM) {
    return 'APPROACH';
  }
  if (estimatedDistanceM < followDistanceM - toleranceM) {
    return 'TOO_CLOSE';
  }
  return 'HOLD';
}

/** Mean of shoulder presence/visibility; 0 if missing, 1/0 fallback when fields absent. */
export function computeConfidence(landmarks: Landmark[]): number {
  const left = landmarks[LEFT_SHOULDER_INDEX];
  const right = landmarks[RIGHT_SHOULDER_INDEX];
  if (!left && !right) {
    return 0;
  }

  const scores: number[] = [];
  for (const lm of [left, right]) {
    if (!lm) continue;
    const presence = typeof lm.presence === 'number' ? lm.presence : 1;
    const visibility = typeof lm.visibility === 'number' ? lm.visibility : 1;
    scores.push((presence + visibility) / 2);
  }

  if (scores.length === 0) {
    return 0;
  }
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}
