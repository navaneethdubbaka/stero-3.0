import { TrackingEngine } from '../src/vision/TrackingEngine';
import { useTrackingStore } from '../src/store/useTrackingStore';
import { LOST_TIMEOUT_MS } from '../src/vision/types';
import type { PoseDetectedEvent } from '../src/vision/VisionCameraView';

jest.mock('../src/store/useSettingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      robot: {
        followDistance: 1.0,
        trackingSensitivity: 0.5,
        motorSpeed: 150,
        useDifferentialDrive: false,
      },
    }),
  },
}));

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

  it('fires PERSON_FOUND then PERSON_LOST after timeout', () => {
    const events: string[] = [];
    const unsub = TrackingEngine.subscribe((event) => {
      events.push(event);
    });

    TrackingEngine.ingest(pose());
    expect(events).toContain('PERSON_FOUND');
    expect(useTrackingStore.getState().targetLocked).toBe(true);

    TrackingEngine.ingest(pose({ personFound: false, landmarks: [] }));
    expect(useTrackingStore.getState().targetLocked).toBe(true);

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
    TrackingEngine.ingest(pose({ personFound: false }));
    jest.advanceTimersByTime(400);
    TrackingEngine.ingest(pose()); // clears pending PERSON_LOST
    jest.advanceTimersByTime(400);

    expect(events.filter((e) => e === 'PERSON_LOST')).toHaveLength(0);
    expect(useTrackingStore.getState().targetLocked).toBe(true);
  });
});
