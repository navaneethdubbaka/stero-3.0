import { DanceMode } from '../src/robot/DanceMode';
import { useDanceStore } from '../src/store/useDanceStore';
import { useRobotStore } from '../src/store/useRobotStore';

const mockClaim = jest.fn();
const mockRelease = jest.fn();
const mockRequestDanceStart = jest.fn(() => ({
  ok: true,
  from: 'IDLE',
  to: 'DANCING',
}));
const mockRequestDanceEnd = jest.fn(() => ({
  ok: true,
  from: 'DANCING',
  to: 'IDLE',
}));
const mockGetState = jest.fn(() => 'IDLE');
const mockFollowStop = jest.fn();
const mockFollowEnabled = jest.fn(() => false);

jest.mock('../src/robot/RobotController', () => ({
  RobotController: {
    claim: (...args: any[]) => mockClaim(...args),
    release: (...args: any[]) => mockRelease(...args),
    start: jest.fn(),
    attachStore: jest.fn(),
  },
}));

jest.mock('../src/robot/CompanionStateMachine', () => ({
  CompanionStateMachine: {
    getState: () => mockGetState(),
    requestDanceStart: () => mockRequestDanceStart(),
    requestDanceEnd: () => mockRequestDanceEnd(),
  },
}));

jest.mock('../src/robot/FollowMode', () => ({
  FollowMode: {
    isEnabled: () => mockFollowEnabled(),
    stop: () => mockFollowStop(),
    start: jest.fn(),
  },
}));

jest.mock('../src/services/SleepSystem', () => ({
  __esModule: true,
  default: { reportActivity: jest.fn(), start: jest.fn(), stop: jest.fn() },
}));

jest.mock('../src/voice/VoiceService', () => ({
  __esModule: true,
  default: { speak: jest.fn(() => Promise.resolve('')) },
}));

jest.mock('../src/store/useEmotionStore', () => ({
  useEmotionStore: {
    getState: () => ({ setEmotion: jest.fn() }),
  },
}));

describe('DanceMode', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockClaim.mockClear();
    mockRelease.mockClear();
    mockRequestDanceStart.mockClear();
    mockRequestDanceEnd.mockClear();
    mockFollowStop.mockClear();
    mockFollowEnabled.mockReturnValue(false);
    mockGetState.mockReturnValue('IDLE');
    mockRequestDanceStart.mockReturnValue({ ok: true, from: 'IDLE', to: 'DANCING' });
    DanceMode.stop('reset');
    useDanceStore.getState().reset();
    useRobotStore.setState({
      isConnected: true,
      emergencyActive: false,
    } as any);
  });

  afterEach(() => {
    DanceMode.stop('reset');
    jest.useRealTimers();
  });

  it('starts from IDLE and claims DANCE motors', () => {
    const r = DanceMode.start('spin_happy');
    expect(r.ok).toBe(true);
    expect(DanceMode.isEnabled()).toBe(true);
    expect(mockRequestDanceStart).toHaveBeenCalled();
    expect(useDanceStore.getState().status).toBe('PLAYING');

    jest.advanceTimersByTime(0);
    expect(mockClaim).toHaveBeenCalledWith('DANCE', {
      kind: 'discrete',
      direction: 'L',
    });
  });

  it('rejects start when companion is not IDLE', () => {
    mockGetState.mockReturnValue('LISTENING');
    const r = DanceMode.start();
    expect(r.ok).toBe(false);
    expect(DanceMode.isEnabled()).toBe(false);
    expect(mockRequestDanceStart).not.toHaveBeenCalled();
  });

  it('rejects when DANCE_START fails', () => {
    mockRequestDanceStart.mockReturnValue({
      ok: false,
      from: 'IDLE',
      to: 'IDLE',
      reason: 'blocked',
    });
    const r = DanceMode.start();
    expect(r.ok).toBe(false);
  });

  it('stop releases DANCE and ends companion state', () => {
    DanceMode.start('wiggle');
    mockGetState.mockReturnValue('DANCING');
    DanceMode.stop('manual');
    expect(mockRelease).toHaveBeenCalledWith('DANCE');
    expect(mockRequestDanceEnd).toHaveBeenCalled();
    expect(DanceMode.isEnabled()).toBe(false);
    expect(useDanceStore.getState().status).toBe('ABORT');
  });

  it('stops Follow before dancing', () => {
    mockFollowEnabled.mockReturnValue(true);
    mockGetState
      .mockReturnValueOnce('FOLLOWING')
      .mockReturnValueOnce('IDLE');
    const r = DanceMode.start('spin_happy');
    expect(mockFollowStop).toHaveBeenCalled();
    expect(r.ok).toBe(true);
  });

  it('USB drop aborts dance', () => {
    DanceMode.start('spin_happy');
    mockGetState.mockReturnValue('DANCING');
    useRobotStore.setState({ isConnected: false } as any);
    expect(DanceMode.isEnabled()).toBe(false);
    expect(useDanceStore.getState().status).toBe('ABORT');
  });

  it('E-stop aborts dance', () => {
    DanceMode.start('spin_happy');
    mockGetState.mockReturnValue('DANCING');
    useRobotStore.setState({ emergencyActive: true } as any);
    expect(DanceMode.isEnabled()).toBe(false);
  });

  it('completes routine and returns OFF', () => {
    DanceMode.start('wiggle');
    mockGetState.mockReturnValue('DANCING');
    jest.advanceTimersByTime(6000);
    expect(DanceMode.isEnabled()).toBe(false);
    expect(useDanceStore.getState().status).toBe('OFF');
  });
});
