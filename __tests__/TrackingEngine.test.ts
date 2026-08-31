import { TrackingEngine } from '../src/vision/TrackingEngine';
import { useTrackingStore } from '../src/store/useTrackingStore';
import { LOCK_HOLD_MS, LOST_TIMEOUT_MS } from '../src/vision/types';
import type { PersonDetectionEvent, PoseDetectedEvent } from '../src/vision/VisionCameraView';

jest.mock('../src/store/useSettingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      robot: {
        followDistance: 1.0,
        trackingSensitivity: 0.5,
        motorSpeed: 150,
        useDifferentialDrive: false,
        followMaxPwm: 180,
        followMinPwm: 80,
        curveGain: 1.0,
        maxRotateBurstMs: 2500,
        searchOnLost: 'wait',
      },
    }),
  },
}));

const det = (
  offset: number,
  bbox: { x: number; y: number; w: number; h: number }
): PersonDetectionEvent => ({
  offset,
  shoulderWidth: 0.2,
  distanceZone: 'MEDIUM',
  landmarks: [],
  bbox,
});

const pose = (overrides: Partial<PoseDetectedEvent> = {}): PoseDetectedEvent => ({
  personFound: true,
  offset: 0.02,
  distanceZone: 'MEDIUM',
  shoulderWidth: 0.2,
  landmarks: [],
  error: null,
  ...overrides,
});

describe('TrackingEngine lost edge', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    TrackingEngine.reset();
  });

  afterEach(() => {
    TrackingEngine.reset();
    jest.useRealTimers();
  });

  it('fires PERSON_FOUND then PERSON_LOST after timeout when unlocked', () => {
    const events: string[] = [];
    const unsub = TrackingEngine.subscribe((event) => {
      events.push(event);
    });

    TrackingEngine.ingest(pose());
    expect(events).toContain('PERSON_FOUND');
    expect(useTrackingStore.getState().personFound).toBe(true);
    expect(useTrackingStore.getState().targetLocked).toBe(false);

    TrackingEngine.ingest(pose({ personFound: false, landmarks: [], people: [] }));
    jest.advanceTimersByTime(LOST_TIMEOUT_MS);
    expect(events).toContain('PERSON_LOST');
    expect(useTrackingStore.getState().targetLocked).toBe(false);
    expect(TrackingEngine.getWasLocked()).toBe(false);

    unsub();
  });

  it('cancels lost timer if person returns', () => {
    const events: string[] = [];
    TrackingEngine.subscribe((event) => events.push(event));

    TrackingEngine.ingest(pose());
    TrackingEngine.ingest(pose({ personFound: false, people: [] }));
    jest.advanceTimersByTime(400);
    TrackingEngine.ingest(pose());
    jest.advanceTimersByTime(400);

    expect(events.filter((e) => e === 'PERSON_LOST')).toHaveLength(0);
    expect(useTrackingStore.getState().personFound).toBe(true);
  });

  it('lock stays on A when B is closer and A is briefly gone', () => {
    const a = det(-0.2, { x: 0.1, y: 0.2, w: 0.2, h: 0.45 });
    const b = det(0.25, { x: 0.6, y: 0.2, w: 0.2, h: 0.45 });
    const t0 = 1_000_000;

    TrackingEngine.ingest(
      pose({
        people: [a, b],
        offset: a.offset,
        personFound: true,
      }),
      t0
    );
    const idA = useTrackingStore.getState().people.find((p) => p.offset < 0)?.trackId;
    expect(idA).toBeDefined();
    TrackingEngine.lockTrack(idA!);
    expect(useTrackingStore.getState().lockedTrackId).toBe(idA);
    expect(useTrackingStore.getState().targetLocked).toBe(true);
    expect(useTrackingStore.getState().offset).toBeCloseTo(-0.2);

    TrackingEngine.ingest(
      pose({
        people: [b],
        offset: b.offset,
        personFound: true,
      }),
      t0 + 500
    );
    expect(useTrackingStore.getState().lockedTrackId).toBe(idA);
    expect(useTrackingStore.getState().targetLocked).toBe(true);
    expect(useTrackingStore.getState().offset).toBeCloseTo(-0.2);
    expect(useTrackingStore.getState().personFound).toBe(false);

    TrackingEngine.ingest(
      pose({
        people: [b],
        offset: b.offset,
        personFound: true,
      }),
      t0 + LOCK_HOLD_MS + 100
    );
    expect(useTrackingStore.getState().lockedTrackId).toBe(idA);
    expect(useTrackingStore.getState().targetLocked).toBe(false);
    expect(useTrackingStore.getState().offset).not.toBeCloseTo(0.25);
  });
});
