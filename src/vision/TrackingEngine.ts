import type { PersonDetectionEvent, PoseDetectedEvent } from './VisionCameraView';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTrackingStore } from '../store/useTrackingStore';
import {
  LOCK_HOLD_MS,
  LOST_TIMEOUT_MS,
  TrackingEvent,
  TrackingSnapshot,
  TrackedPerson,
  DistanceZone,
} from './types';
import {
  computeConfidence,
  computeDeadband,
  computeDistanceIntent,
  computeSteerZone,
  estimateDistanceM,
} from './trackingMath';
import { PersonTracker } from './PersonTracker';

export type TrackingListener = (
  event: TrackingEvent,
  snapshot: TrackingSnapshot
) => void;

/**
 * Pose → app state. Never drives motors.
 * Identity lock (`lockedTrackId`) is separate from 800ms HUD fade.
 */
class TrackingEngineImpl {
  private listeners = new Set<TrackingListener>();
  private lostTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSeenAt = 0;
  private wasLocked = false;
  private lockedTrackId: number | null = null;
  private emittedLostForLock = false;

  ingest(raw: PoseDetectedEvent, now: number = Date.now()): void {
    const detections = this.toDetections(raw);
    const tracks = PersonTracker.step(detections, now, this.lockedTrackId);
    this.publish(tracks, raw.error ?? null, now);
  }

  lockTrack(trackId: number): void {
    this.lockedTrackId = trackId;
    this.emittedLostForLock = false;
    this.publish(PersonTracker.getTracks(), null, Date.now());
  }

  /** Lock visible person nearest frame center. `force` replaces an existing lock. */
  lockNearestCenter(force: boolean = false): number | null {
    const visible = PersonTracker.getTracks().filter((t) => t.visible);
    if (visible.length === 0) {
      if (force) {
        this.lockedTrackId = null;
      }
      return this.lockedTrackId;
    }
    if (this.lockedTrackId != null && !force) {
      return this.lockedTrackId;
    }
    visible.sort((a, b) => Math.abs(a.offset) - Math.abs(b.offset));
    this.lockedTrackId = visible[0].trackId;
    this.emittedLostForLock = false;
    this.publish(PersonTracker.getTracks(), null, Date.now());
    return this.lockedTrackId;
  }

  /** Landmark-normalized tap (x,y in 0..1, not mirrored). */
  lockAtPoint(nx: number, ny: number): number | null {
    const tracks = PersonTracker.getTracks().filter((t) => t.visible);
    if (tracks.length === 0) return this.lockedTrackId;
    const hit = tracks.find((t) => {
      const b = t.bbox;
      return nx >= b.x && nx <= b.x + b.w && ny >= b.y && ny <= b.y + b.h;
    });
    if (hit) {
      this.lockTrack(hit.trackId);
      return hit.trackId;
    }
    let best = tracks[0];
    let bestD = Infinity;
    for (const t of tracks) {
      const cx = t.bbox.x + t.bbox.w / 2;
      const cy = t.bbox.y + t.bbox.h / 2;
      const d = Math.hypot(cx - nx, cy - ny);
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    this.lockTrack(best.trackId);
    return best.trackId;
  }

  clearLock(): void {
    this.lockedTrackId = null;
    this.emittedLostForLock = false;
    this.publish(PersonTracker.getTracks(), null, Date.now());
  }

  getLockedTrackId(): number | null {
    return this.lockedTrackId;
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
    this.lockedTrackId = null;
    this.emittedLostForLock = false;
    PersonTracker.reset();
    useTrackingStore.getState().reset();
  }

  /** Test helper */
  getWasLocked(): boolean {
    return this.wasLocked;
  }

  private toDetections(raw: PoseDetectedEvent): PersonDetectionEvent[] {
    if (raw.people && raw.people.length > 0) {
      return raw.people;
    }
    if (raw.personFound) {
      return [
        {
          offset: raw.offset ?? 0,
          shoulderWidth: raw.shoulderWidth ?? 0,
          distanceZone: raw.distanceZone ?? 'FAR',
          landmarks: raw.landmarks ?? [],
        },
      ];
    }
    return [];
  }

  private publish(
    tracks: TrackedPerson[],
    error: string | null,
    now: number
  ): void {
    const settings = useSettingsStore.getState().robot;
    const deadband = computeDeadband(settings.trackingSensitivity);
    const locked =
      this.lockedTrackId != null
        ? tracks.find((t) => t.trackId === this.lockedTrackId) ?? null
        : null;
    const anyVisible = tracks.some((t) => t.visible);

    let personFound = false;
    let targetLocked = false;
    let primary: TrackedPerson | null = locked;
    let lostMs = 0;

    if (locked) {
      personFound = locked.visible;
      lostMs = locked.visible ? 0 : Math.max(0, now - locked.lastSeenAt);
      targetLocked = locked.visible || lostMs < LOCK_HOLD_MS;
      if (locked.visible) {
        this.lastSeenAt = now;
        this.clearLostTimer();
        this.emittedLostForLock = false;
      }
    } else {
      personFound = anyVisible;
      primary =
        tracks
          .filter((t) => t.visible)
          .sort((a, b) => Math.abs(a.offset) - Math.abs(b.offset))[0] ?? null;
      if (personFound) {
        this.lastSeenAt = now;
        this.clearLostTimer();
        this.scheduleLostTimer();
        lostMs = 0;
      } else {
        lostMs =
          this.lastSeenAt === 0 ? 0 : Math.max(0, now - this.lastSeenAt);
      }
      targetLocked = false;
    }

    const landmarks = primary?.landmarks ?? [];
    const offset = primary?.offset ?? 0;
    const shoulderWidth = primary?.shoulderWidth ?? 0;
    const distanceZone = (primary?.distanceZone ?? 'FAR') as DistanceZone;
    const estimatedDistanceM = primary
      ? estimateDistanceM(shoulderWidth)
      : useTrackingStore.getState().estimatedDistanceM;

    const snapshot: TrackingSnapshot = {
      personFound,
      targetLocked,
      offset,
      shoulderWidth,
      distanceZone,
      landmarks,
      confidence:
        primary && primary.visible
          ? computeConfidence(landmarks)
          : primary
            ? computeConfidence(landmarks) * 0.5
            : 0,
      deadband,
      steerZone: computeSteerZone(offset, deadband),
      estimatedDistanceM,
      distanceIntent: computeDistanceIntent(estimatedDistanceM, settings.followDistance),
      lostMs,
      error,
      lastUpdatedAt: now,
      people: tracks,
      lockedTrackId: this.lockedTrackId,
    };

    if (locked && !targetLocked && lostMs >= LOST_TIMEOUT_MS) {
      snapshot.landmarks = [];
      snapshot.steerZone = 'CENTER';
    }

    if (!locked && !personFound && lostMs >= LOST_TIMEOUT_MS) {
      snapshot.landmarks = [];
      snapshot.offset = 0;
      snapshot.confidence = 0;
      snapshot.steerZone = 'CENTER';
    }

    useTrackingStore.getState().applySnapshot(snapshot);

    if (locked) {
      if (locked.visible && !this.wasLocked) {
        this.wasLocked = true;
        this.emit('PERSON_FOUND', snapshot);
      } else if (locked.visible && this.wasLocked) {
        this.emit('TARGET_UPDATED', snapshot);
      } else if (!targetLocked && this.wasLocked && !this.emittedLostForLock) {
        this.wasLocked = false;
        this.emittedLostForLock = true;
        // Release the lock once the target is gone for good so Follow can
        // re-acquire another person instead of searching forever.
        this.lockedTrackId = null;
        this.emit('PERSON_LOST', snapshot);
      }
      return;
    }

    if (personFound && !this.wasLocked) {
      this.wasLocked = true;
      this.emit('PERSON_FOUND', snapshot);
    } else if (personFound && this.wasLocked) {
      this.emit('TARGET_UPDATED', snapshot);
    }
  }

  private scheduleLostTimer(): void {
    this.clearLostTimer();
    this.lostTimer = setTimeout(() => {
      this.handleLostTimeout();
    }, LOST_TIMEOUT_MS);
  }

  private handleLostTimeout(): void {
    this.lostTimer = null;
    if (this.lockedTrackId != null) {
      return;
    }
    if (!this.wasLocked) {
      return;
    }
    this.wasLocked = false;
    this.publish(PersonTracker.getTracks(), null, Date.now());
    const snapshot = useTrackingStore.getState();
    this.emit('PERSON_LOST', {
      personFound: snapshot.personFound,
      targetLocked: snapshot.targetLocked,
      offset: snapshot.offset,
      shoulderWidth: snapshot.shoulderWidth,
      distanceZone: snapshot.distanceZone,
      landmarks: snapshot.landmarks,
      confidence: snapshot.confidence,
      deadband: snapshot.deadband,
      steerZone: snapshot.steerZone,
      estimatedDistanceM: snapshot.estimatedDistanceM,
      distanceIntent: snapshot.distanceIntent,
      lostMs: snapshot.lostMs,
      error: snapshot.error,
      lastUpdatedAt: snapshot.lastUpdatedAt,
      people: snapshot.people,
      lockedTrackId: snapshot.lockedTrackId,
    });
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
