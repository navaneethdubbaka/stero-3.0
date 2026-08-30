import { FollowMode, ANTI_SPIN_MS } from '../src/robot/FollowMode';
import { useTrackingStore } from '../src/store/useTrackingStore';
import { useFollowStore } from '../src/store/useFollowStore';
import type { TrackingSnapshot } from '../src/vision/types';

jest.mock('../src/robot/RobotController', () => ({
  RobotController: {
    requestFollowDrive: jest.fn(),
    start: jest.fn(),
    attachStore: jest.fn(),
    requestManualDrive: jest.fn(),
    requestWebDrive: jest.fn(),
    setSpeed: jest.fn(),
    emergencyStop: jest.fn(),
    clearEmergency: jest.fn(),
  },
}));

jest.mock('../src/vision/TrackingEngine', () => ({
  TrackingEngine: {
    subscribe: jest.fn(() => jest.fn()),
  },
}));

jest.mock('../src/services/SleepSystem', () => ({
  __esModule: true,
  default: { reportActivity: jest.fn(), start: jest.fn(), stop: jest.fn() },
}));

jest.mock('../src/robot/CompanionStateMachine', () => ({
  CompanionStateMachine: {
    canFollow: jest.fn(() => true),
    getState: jest.fn(() => 'IDLE'),
    dispatch: jest.fn(() => ({ ok: true, from: 'IDLE', to: 'FOLLOWING' })),
  },
}));

const { RobotController } = require('../src/robot/RobotController');

const applySnap = (overrides: Partial<TrackingSnapshot>) => {
  useTrackingStore.getState().applySnapshot({
    personFound: true,
    targetLocked: true,
    offset: 0,
    shoulderWidth: 0.2,
    distanceZone: 'MEDIUM',
    landmarks: [],
    confidence: 1,
    deadband: 0.15,
    steerZone: 'CENTER',
    estimatedDistanceM: 1.0,
    distanceIntent: 'HOLD',
    lostMs: 0,
    error: null,
    lastUpdatedAt: Date.now(),
    ...overrides,
  });
};

describe('FollowMode', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    FollowMode.stop();
    useFollowStore.getState().reset();
    useTrackingStore.getState().reset();
    jest.clearAllMocks();
  });

  afterEach(() => {
    FollowMode.stop();
    jest.useRealTimers();
  });

  it('claims F when CENTER + APPROACH', () => {
    applySnap({
      steerZone: 'CENTER',
      distanceIntent: 'APPROACH',
      distanceZone: 'FAR',
      estimatedDistanceM: 2.5,
    });
    FollowMode.start();
    expect(RobotController.requestFollowDrive).toHaveBeenCalledWith('F');
    expect(useFollowStore.getState().status).toBe('FOLLOWING');
  });

  it('releases FOLLOW (S) when HOLD', () => {
    applySnap({
      steerZone: 'CENTER',
      distanceIntent: 'HOLD',
      distanceZone: 'MEDIUM',
    });
    FollowMode.start();
    expect(RobotController.requestFollowDrive).toHaveBeenCalledWith('S');
    expect(useFollowStore.getState().status).toBe('HOLD');
  });

  it('anti-spin forces S after continuous rotate', () => {
    const t0 = Date.now();
    jest.setSystemTime(t0);

    applySnap({
      steerZone: 'LEFT',
      offset: -0.3,
      distanceIntent: 'APPROACH',
      distanceZone: 'FAR',
    });
    FollowMode.start();
    expect(RobotController.requestFollowDrive).toHaveBeenCalledWith('L');

    jest.setSystemTime(t0 + ANTI_SPIN_MS);
    jest.advanceTimersByTime(100); // fire interval tick after latch window
    expect(RobotController.requestFollowDrive).toHaveBeenCalledWith('S');
  });

  it('SEARCHING when not locked', () => {
    applySnap({ targetLocked: false, personFound: false });
    FollowMode.start();
    expect(useFollowStore.getState().status).toBe('SEARCHING');
    expect(RobotController.requestFollowDrive).toHaveBeenCalledWith('S');
  });
});
