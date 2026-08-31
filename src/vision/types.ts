import type { Landmark } from './VisionCameraView';

export type { Landmark };

export type DistanceZone = 'CLOSE' | 'MEDIUM' | 'FAR';

export type SteerZone = 'LEFT' | 'CENTER' | 'RIGHT';

export type DistanceIntent = 'APPROACH' | 'HOLD' | 'TOO_CLOSE';

export type TrackingEvent = 'PERSON_FOUND' | 'PERSON_LOST' | 'TARGET_UPDATED';

export type BBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/** One associated person for HUD / lock. */
export type TrackedPerson = {
  trackId: number;
  landmarks: Landmark[];
  offset: number;
  shoulderWidth: number;
  distanceZone: DistanceZone;
  bbox: BBox;
  visible: boolean;
  lastSeenAt: number;
};

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
  people: TrackedPerson[];
  lockedTrackId: number | null;
};

/** HUD fade of missing landmarks. */
export const LOST_TIMEOUT_MS = 800;

/** Identity lock: do not switch to another person during this occlusion. */
export const LOCK_HOLD_MS = 2000;

export const DISTANCE_INTENT_TOLERANCE_M = 0.25;

/** Soft ranging: estimatedDistanceM = clamp(K / shoulderWidth, MIN, MAX) */
export const DISTANCE_SCALE_K = 0.4;
export const DISTANCE_MIN_M = 0.4;
export const DISTANCE_MAX_M = 5.0;

/** MediaPipe Pose landmark indices for shoulders */
export const LEFT_SHOULDER_INDEX = 11;
export const RIGHT_SHOULDER_INDEX = 12;
