import type { TrackingSnapshot } from '../vision/types';
import type { MovementDirection } from './types';

/**
 * Pure mapping from tracking snapshot → discrete motor command.
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
