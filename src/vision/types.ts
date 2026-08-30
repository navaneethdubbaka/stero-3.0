import type { Landmark } from './VisionCameraView';

export type { Landmark };

export type DistanceZone = 'CLOSE' | 'MEDIUM' | 'FAR';

export type SteerZone = 'LEFT' | 'CENTER' | 'RIGHT';

export type DistanceIntent = 'APPROACH' | 'HOLD' | 'TOO_CLOSE';

export type TrackingEvent = 'PERSON_FOUND' | 'PERSON_LOST' | 'TARGET_UPDATED';

export type TrackingSnapshot = {
  personFound: boolean;
  targetLocked: boolean;
  offset: number;
  shoulderWidth: number;
  distanceZone: DistanceZone;
  landmarks: Landmark[];
  confidence: number;
  deadband: number;
  steerZone: SteerZone;
  estimatedDistanceM: number;
  distanceIntent: DistanceIntent;
  lostMs: number;
  error: string | null;
  lastUpdatedAt: number;
};

export const LOST_TIMEOUT_MS = 800;

export const DISTANCE_INTENT_TOLERANCE_M = 0.25;

/** Soft ranging: estimatedDistanceM = clamp(K / shoulderWidth, MIN, MAX) */
export const DISTANCE_SCALE_K = 0.4;
export const DISTANCE_MIN_M = 0.4;
export const DISTANCE_MAX_M = 5.0;

/** MediaPipe Pose landmark indices for shoulders */
export const LEFT_SHOULDER_INDEX = 11;
export const RIGHT_SHOULDER_INDEX = 12;
