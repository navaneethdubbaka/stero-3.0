import { FollowMode, ANTI_SPIN_MS } from '../src/robot/FollowMode';
import { useTrackingStore } from '../src/store/useTrackingStore';
import { useFollowStore } from '../src/store/useFollowStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import type { TrackingSnapshot } from '../src/vision/types';

jest.mock('../src/robot/RobotController', () => ({
  RobotController: {
    requestFollowDrive: jest.fn(),
    requestFollowDiff: jest.fn(),
    getUseDifferentialDrive: jest.fn(() => false),
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
    lockNearestCenter: jest.fn(),
    clearLock: jest.fn(),
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

jest.mock('../src/utils/deviceHealth', () => ({
  getDeviceHealth: jest.fn(() => ({
    batteryPercent: 80,
    thermalStatus: 0,
    lowBattery: false,
    thermalSevere: false,
  })),
}));

jest.mock('../src/store/useEmotionStore', () => ({
  useEmotionStore: {
    getState: () => ({ setEmotion: jest.fn() }),
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
    people: [],
    lockedTrackId: null,
    ...overrides,
  });
};

describe('FollowMode', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    FollowMode.stop();
    useFollowStore.getState().reset();
    useTrackingStore.getState().reset();
    RobotController.getUseDifferentialDrive.mockReturnValue(false);
    const { getDeviceHealth } = require('../src/utils/deviceHealth');
    getDeviceHealth.mockReturnValue({
      batteryPercent: 80,
      thermalStatus: 0,
      lowBattery: false,
      thermalSevere: false,
    });
    useSettingsStore.setState((s) => ({
      robot: {
        ...s.robot,
        useDifferentialDrive: false,
        followMaxPwm: 180,
        followMinPwm: 80,
        curveGain: 1.0,
        maxRotateBurstMs: ANTI_SPIN_MS,
        motorSpeed: 150,
        searchOnLost: 'wait',
      },
    }));
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

  it('diff mode: CLOSE sends zeros via requestFollowDiff', () => {
    RobotController.getUseDifferentialDrive.mockReturnValue(true);
    useSettingsStore.setState((s) => ({
      robot: { ...s.robot, useDifferentialDrive: true },
    }));

    applySnap({
      steerZone: 'CENTER',
      distanceIntent: 'APPROACH',
      distanceZone: 'CLOSE',
    });
    FollowMode.start();
    expect(RobotController.requestFollowDiff).toHaveBeenCalledWith(0, 0);
  });

  it('diff mode: FAR center slews toward equal PWM', () => {
    RobotController.getUseDifferentialDrive.mockReturnValue(true);
    useSettingsStore.setState((s) => ({
      robot: { ...s.robot, useDifferentialDrive: true },
    }));

    applySnap({
      steerZone: 'CENTER',
      offset: 0,
      distanceIntent: 'APPROACH',
      distanceZone: 'FAR',
      estimatedDistanceM: 2.5,
    });
    FollowMode.start();
    // First tick slews ±32 toward ~150 (min motorSpeed, maxPwm)
    expect(RobotController.requestFollowDiff).toHaveBeenCalled();
    const [left, right] = RobotController.requestFollowDiff.mock.calls[0];
    expect(left).toBe(right);
    expect(left).toBeGreaterThan(0);
    expect(left).toBeLessThanOrEqual(32);
  });

  it('refuses start when battery is low', () => {
    const { getDeviceHealth } = require('../src/utils/deviceHealth');
    getDeviceHealth.mockReturnValue({
      batteryPercent: 10,
      thermalStatus: 0,
      lowBattery: true,
      thermalSevere: false,
    });
    applySnap({
      steerZone: 'CENTER',
      distanceIntent: 'APPROACH',
      distanceZone: 'FAR',
    });
    const ok = FollowMode.start();
    expect(ok).toBe(false);
    expect(FollowMode.getLastStartBlock()).toBe('battery');
    expect(RobotController.requestFollowDrive).not.toHaveBeenCalled();
  });

  it('searchOnLost wait issues S and does not rotate', () => {
    useSettingsStore.setState((s) => ({
      robot: { ...s.robot, searchOnLost: 'wait' },
    }));
    applySnap({ targetLocked: false, personFound: false, lockedTrackId: 1 });
    FollowMode.start();
    expect(useFollowStore.getState().status).toBe('SEARCHING');
    expect(RobotController.requestFollowDrive).toHaveBeenCalledWith('S');
    expect(RobotController.requestFollowDrive).not.toHaveBeenCalledWith('L');
    expect(RobotController.requestFollowDrive).not.toHaveBeenCalledWith('R');
  });

  it('searchOnLost rotate stops after anti-spin / budget', () => {
    useSettingsStore.setState((s) => ({
      robot: { ...s.robot, searchOnLost: 'rotate', maxRotateBurstMs: ANTI_SPIN_MS },
    }));
    const t0 = Date.now();
    jest.setSystemTime(t0);
    applySnap({ targetLocked: false, personFound: false, offset: -0.2, lockedTrackId: 1 });
    FollowMode.start();
    expect(RobotController.requestFollowDrive).toHaveBeenCalledWith('L');

    jest.setSystemTime(t0 + ANTI_SPIN_MS);
    jest.advanceTimersByTime(100);
    expect(RobotController.requestFollowDrive).toHaveBeenCalledWith('S');
  });

  it('searchOnLost off stops Follow when lock is lost', () => {
    useSettingsStore.setState((s) => ({
      robot: { ...s.robot, searchOnLost: 'off' },
    }));
    applySnap({ targetLocked: false, personFound: false });
    FollowMode.start();
    expect(FollowMode.isEnabled()).toBe(false);
    expect(useFollowStore.getState().status).toBe('OFF');
  });
});
