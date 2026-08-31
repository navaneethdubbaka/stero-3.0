import type { Landmark } from './VisionCameraView';
import type { PersonDetectionEvent } from './VisionCameraView';
import type { BBox, DistanceZone, TrackedPerson } from './types';
import { LOCK_HOLD_MS } from './types';

const IOU_MIN = 0.15;
const CENTER_MAX = 0.18;
const SHOULDER_RATIO_MAX = 0.55;

export type RawDetection = PersonDetectionEvent;

export function bboxFromLandmarks(landmarks: Landmark[]): BBox {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  let any = false;
  for (const lm of landmarks) {
    if (!lm || typeof lm.x !== 'number' || typeof lm.y !== 'number') continue;
    const vis = typeof lm.visibility === 'number' ? lm.visibility : 1;
    if (vis < 0.2) continue;
    any = true;
    minX = Math.min(minX, lm.x);
    minY = Math.min(minY, lm.y);
    maxX = Math.max(maxX, lm.x);
    maxY = Math.max(maxY, lm.y);
  }
  if (!any) {
    return { x: 0.4, y: 0.3, w: 0.2, h: 0.4 };
  }
  const pad = 0.04;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(1, maxX + pad);
  maxY = Math.min(1, maxY + pad);
  return { x: minX, y: minY, w: Math.max(0.02, maxX - minX), h: Math.max(0.02, maxY - minY) };
}

export function iou(a: BBox, b: BBox): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.w * a.h + b.w * b.h - inter;
  if (union <= 0) return 0;
  return inter / union;
}

export function centerDist(a: BBox, b: BBox): number {
  const acx = a.x + a.w / 2;
  const acy = a.y + a.h / 2;
  const bcx = b.x + b.w / 2;
  const bcy = b.y + b.h / 2;
  return Math.hypot(acx - bcx, acy - bcy);
}

function resolveBbox(det: RawDetection): BBox {
  if (det.bbox && det.bbox.w > 0 && det.bbox.h > 0) {
    return det.bbox;
  }
  return bboxFromLandmarks(det.landmarks ?? []);
}

function matchScore(det: RawDetection, track: TrackedPerson, bbox: BBox): number {
  const i = iou(bbox, track.bbox);
  const cd = centerDist(bbox, track.bbox);
  const swDen = Math.max(det.shoulderWidth, track.shoulderWidth, 0.01);
  const sw = Math.abs(det.shoulderWidth - track.shoulderWidth) / swDen;
  if (i < IOU_MIN && cd > CENTER_MAX) {
    return 0;
  }
  if (sw > SHOULDER_RATIO_MAX && i < 0.35) {
    return 0;
  }
  return i * 2 + (1 - Math.min(1, cd / CENTER_MAX)) + (1 - Math.min(1, sw));
}

/**
 * Greedy IoU / center / shoulder-width association. Not ReID.
 * Locked tracks stay as ghosts after LOCK_HOLD_MS so they can reacquire
 * without stealing another person's id.
 */
class PersonTrackerImpl {
  private nextId = 1;
  private tracks: TrackedPerson[] = [];

  reset(): void {
    this.nextId = 1;
    this.tracks = [];
  }

  getTracks(): TrackedPerson[] {
    return this.tracks;
  }

  step(
    detections: RawDetection[],
    now: number,
    lockedTrackId: number | null
  ): TrackedPerson[] {
    const dets = detections.map((d) => ({
      ...d,
      landmarks: d.landmarks ?? [],
      offset: d.offset ?? 0,
      shoulderWidth: d.shoulderWidth ?? 0,
      distanceZone: (d.distanceZone ?? 'FAR') as DistanceZone,
      bbox: resolveBbox(d),
    }));

    const usedDets = new Set<number>();
    const usedTracks = new Set<number>();
    const pairs: { di: number; ti: number; score: number }[] = [];

    for (let di = 0; di < dets.length; di++) {
      for (let ti = 0; ti < this.tracks.length; ti++) {
        const score = matchScore(dets[di], this.tracks[ti], dets[di].bbox);
        if (score > 0) {
          pairs.push({ di, ti, score });
        }
      }
    }
    pairs.sort((a, b) => b.score - a.score);

    const next: TrackedPerson[] = [];
    for (const p of pairs) {
      if (usedDets.has(p.di) || usedTracks.has(p.ti)) continue;
      usedDets.add(p.di);
      usedTracks.add(p.ti);
      const d = dets[p.di];
      const prev = this.tracks[p.ti];
      next.push({
        trackId: prev.trackId,
        landmarks: d.landmarks,
        offset: d.offset,
        shoulderWidth: d.shoulderWidth,
        distanceZone: d.distanceZone,
        bbox: d.bbox,
        visible: true,
        lastSeenAt: now,
      });
    }

    for (let di = 0; di < dets.length; di++) {
      if (usedDets.has(di)) continue;
      const d = dets[di];
      next.push({
        trackId: this.nextId++,
        landmarks: d.landmarks,
        offset: d.offset,
        shoulderWidth: d.shoulderWidth,
        distanceZone: d.distanceZone,
        bbox: d.bbox,
        visible: true,
        lastSeenAt: now,
      });
    }

    for (let ti = 0; ti < this.tracks.length; ti++) {
      if (usedTracks.has(ti)) continue;
      const t = this.tracks[ti];
      const age = now - t.lastSeenAt;
      const keepLocked = lockedTrackId != null && t.trackId === lockedTrackId;
      if (keepLocked || age < LOCK_HOLD_MS) {
        next.push({ ...t, visible: false });
      }
    }

    this.tracks = next;
    return this.tracks;
  }
}

export const PersonTracker = new PersonTrackerImpl();
