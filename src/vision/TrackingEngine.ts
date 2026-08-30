import type { PoseDetectedEvent } from './VisionCameraView';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTrackingStore } from '../store/useTrackingStore';
import {
  LOST_TIMEOUT_MS,
  TrackingEvent,
  TrackingSnapshot,
  DistanceZone,
} from './types';
import {
  computeConfidence,
  computeDeadband,
  computeDistanceIntent,
  computeSteerZone,
  estimateDistanceM,
} from './trackingMath';

export type TrackingListener = (
  event: TrackingEvent,
  snapshot: TrackingSnapshot
) => void;

/**
 * Pose → app state. VisionScreen (or a future Face host) forwards native
 * pose events here. Never drives motors.
 */
class TrackingEngineImpl {
  private listeners = new Set<TrackingListener>();
  private lostTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSeenAt = 0;
  private wasLocked = false;

  ingest(raw: PoseDetectedEvent): void {
    const now = Date.now();
    const settings = useSettingsStore.getState().robot;
    const deadband = computeDeadband(settings.trackingSensitivity);
    const personFound = !!raw.personFound;
    const offset = raw.offset ?? 0;
    const shoulderWidth = raw.shoulderWidth ?? 0;
    const distanceZone = (raw.distanceZone ?? 'FAR') as DistanceZone;
    const landmarks = raw.landmarks ?? [];
    const error = raw.error ?? null;

    if (personFound) {
      this.lastSeenAt = now;
      this.clearLostTimer();
      this.scheduleLostTimer();
    }

    const lostMs =
      this.lastSeenAt === 0 ? now : Math.max(0, now - this.lastSeenAt);

    const estimatedDistanceM = personFound
      ? estimateDistanceM(shoulderWidth)
      : useTrackingStore.getState().estimatedDistanceM;

    const snapshot: TrackingSnapshot = {
      personFound,
      targetLocked: personFound || (this.wasLocked && lostMs < LOST_TIMEOUT_MS),
      offset,
      shoulderWidth,
      distanceZone,
      landmarks,
      confidence: personFound ? computeConfidence(landmarks) : 0,
      deadband,
      steerZone: computeSteerZone(offset, deadband),
      estimatedDistanceM: personFound
        ? estimatedDistanceM
        : useTrackingStore.getState().estimatedDistanceM,
      distanceIntent: computeDistanceIntent(
        personFound ? estimatedDistanceM : useTrackingStore.getState().estimatedDistanceM,
        settings.followDistance
      ),
      lostMs: personFound ? 0 : lostMs,
      error,
      lastUpdatedAt: now,
    };

    // While still within grace after last sighting, keep prior landmarks for HUD fade
    if (!personFound && this.wasLocked && lostMs < LOST_TIMEOUT_MS) {
      const prev = useTrackingStore.getState();
      snapshot.landmarks = prev.landmarks;
      snapshot.offset = prev.offset;
      snapshot.shoulderWidth = prev.shoulderWidth;
      snapshot.distanceZone = prev.distanceZone;
      snapshot.steerZone = prev.steerZone;
      snapshot.confidence = prev.confidence * 0.5;
    }

    if (!personFound && lostMs >= LOST_TIMEOUT_MS) {
      snapshot.targetLocked = false;
      snapshot.landmarks = [];
      snapshot.confidence = 0;
      snapshot.steerZone = 'CENTER';
      snapshot.offset = 0;
    }

    useTrackingStore.getState().applySnapshot(snapshot);

    if (personFound && !this.wasLocked) {
      this.wasLocked = true;
      this.emit('PERSON_FOUND', snapshot);
    } else if (personFound && this.wasLocked) {
      this.emit('TARGET_UPDATED', snapshot);
    }
    // PERSON_LOST fired from lost timer
  }

  subscribe(listener: TrackingListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  reset(): void {
    this.clearLostTimer();
    this.lastSeenAt = 0;
    this.wasLocked = false;
    useTrackingStore.getState().reset();
  }

  /** Test helper */
  getWasLocked(): boolean {
    return this.wasLocked;
  }

  private scheduleLostTimer(): void {
    this.clearLostTimer();
    this.lostTimer = setTimeout(() => {
      this.handleLostTimeout();
    }, LOST_TIMEOUT_MS);
  }

  private handleLostTimeout(): void {
    this.lostTimer = null;
    if (!this.wasLocked) {
      return;
    }

    this.wasLocked = false;
    const now = Date.now();
    const settings = useSettingsStore.getState().robot;
    const deadband = computeDeadband(settings.trackingSensitivity);
    const snapshot: TrackingSnapshot = {
      personFound: false,
      targetLocked: false,
      offset: 0,
      shoulderWidth: 0,
      distanceZone: 'FAR',
      landmarks: [],
      confidence: 0,
      deadband,
      steerZone: 'CENTER',
      estimatedDistanceM: useTrackingStore.getState().estimatedDistanceM,
      distanceIntent: computeDistanceIntent(
        useTrackingStore.getState().estimatedDistanceM,
        settings.followDistance
      ),
      lostMs: this.lastSeenAt ? now - this.lastSeenAt : LOST_TIMEOUT_MS,
      error: null,
      lastUpdatedAt: now,
    };

    useTrackingStore.getState().applySnapshot(snapshot);
    this.emit('PERSON_LOST', snapshot);
  }

  private clearLostTimer(): void {
    if (this.lostTimer) {
      clearTimeout(this.lostTimer);
      this.lostTimer = null;
    }
  }

  private emit(event: TrackingEvent, snapshot: TrackingSnapshot): void {
    for (const listener of this.listeners) {
      try {
        listener(event, snapshot);
      } catch (e) {
        console.warn('[TrackingEngine] listener error', e);
      }
    }
  }
}

export const TrackingEngine = new TrackingEngineImpl();
