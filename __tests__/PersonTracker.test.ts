import {
  PersonTracker,
  iou,
  bboxFromLandmarks,
} from '../src/vision/PersonTracker';
import type { PersonDetectionEvent } from '../src/vision/VisionCameraView';
import { LOCK_HOLD_MS } from '../src/vision/types';
import type { Landmark } from '../src/vision/VisionCameraView';

const boxDet = (
  offset: number,
  bbox: { x: number; y: number; w: number; h: number },
  shoulderWidth = 0.2
): PersonDetectionEvent => ({
  offset,
  shoulderWidth,
  distanceZone: 'MEDIUM',
  landmarks: [],
  bbox,
});

describe('PersonTracker', () => {
  beforeEach(() => {
    PersonTracker.reset();
  });

  it('computes iou of overlapping boxes', () => {
    expect(iou({ x: 0, y: 0, w: 1, h: 1 }, { x: 0, y: 0, w: 1, h: 1 })).toBe(1);
    expect(iou({ x: 0, y: 0, w: 1, h: 1 }, { x: 2, y: 2, w: 0.1, h: 0.1 })).toBe(0);
  });

  it('bboxFromLandmarks uses visible points', () => {
    const lms: Landmark[] = [
      { x: 0.2, y: 0.3, z: 0, presence: 1, visibility: 1 },
      { x: 0.5, y: 0.8, z: 0, presence: 1, visibility: 1 },
    ];
    const b = bboxFromLandmarks(lms);
    expect(b.x).toBeLessThan(0.2);
    expect(b.w).toBeGreaterThan(0.2);
  });

  it('keeps the same trackId across jittered boxes', () => {
    const a0 = boxDet(-0.2, { x: 0.1, y: 0.2, w: 0.2, h: 0.4 });
    const t0 = PersonTracker.step([a0], 0, null);
    expect(t0).toHaveLength(1);
    const id = t0[0].trackId;

    const a1 = boxDet(-0.18, { x: 0.12, y: 0.21, w: 0.2, h: 0.4 });
    const t1 = PersonTracker.step([a1], 30, id);
    expect(t1).toHaveLength(1);
    expect(t1[0].trackId).toBe(id);
  });

  it('does not steal lock A when B is closer', () => {
    const a = boxDet(-0.2, { x: 0.1, y: 0.2, w: 0.2, h: 0.4 });
    const b = boxDet(0.25, { x: 0.6, y: 0.2, w: 0.2, h: 0.4 });
    const first = PersonTracker.step([a, b], 0, null);
    const idA = first.find((t) => t.offset < 0)!.trackId;
    const idB = first.find((t) => t.offset > 0)!.trackId;
    expect(idA).not.toBe(idB);

    const next = PersonTracker.step(
      [boxDet(0.26, { x: 0.61, y: 0.2, w: 0.2, h: 0.4 }), a],
      40,
      idA
    );
    expect(next.find((t) => t.trackId === idA)?.visible).toBe(true);
    expect(next.find((t) => t.trackId === idA)?.offset).toBeCloseTo(-0.2);
  });

  it('keeps locked A as ghost when only B is visible for <2s', () => {
    const a = boxDet(-0.2, { x: 0.1, y: 0.2, w: 0.2, h: 0.4 });
    const b = boxDet(0.25, { x: 0.6, y: 0.2, w: 0.2, h: 0.4 });
    const first = PersonTracker.step([a, b], 0, null);
    const idA = first.find((t) => t.offset < 0)!.trackId;

    const ghost = PersonTracker.step([b], 400, idA);
    expect(ghost.find((t) => t.trackId === idA)?.visible).toBe(false);
    expect(ghost.find((t) => t.trackId === idA)).toBeTruthy();

    const still = PersonTracker.step([b], LOCK_HOLD_MS - 10, idA);
    expect(still.find((t) => t.trackId === idA)).toBeTruthy();
    expect(still.find((t) => t.trackId === idA)?.visible).toBe(false);
  });
});
