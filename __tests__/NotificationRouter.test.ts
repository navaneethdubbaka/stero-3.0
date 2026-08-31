import {
  routeNotification,
  isInQuietHours,
  maybeSummarizeForLlm,
  NOTIFICATION_DEBOUNCE_MS,
  type NotificationPrefs,
} from '../src/notifications/routeLogic';
import { categorizePackage } from '../src/notifications/packages';
import { NotificationRouter } from '../src/notifications/NotificationRouter';

const mockFollowStop = jest.fn();
const mockDanceStop = jest.fn();
const mockDispatch = jest.fn(() => ({ ok: true, from: 'FOLLOWING', to: 'INTERRUPTED' }));

jest.mock('../src/robot/FollowMode', () => ({
  FollowMode: {
    isEnabled: () => true,
    stop: mockFollowStop,
  },
}));

jest.mock('../src/robot/DanceMode', () => ({
  DanceMode: {
    isEnabled: () => true,
    stop: mockDanceStop,
  },
}));

jest.mock('../src/robot/CompanionStateMachine', () => ({
  CompanionStateMachine: {
    getState: () => 'FOLLOWING',
    dispatch: mockDispatch,
  },
}));

jest.mock('../src/services/SleepSystem', () => ({
  __esModule: true,
  default: { reportActivity: jest.fn() },
}));

jest.mock('../src/voice/VoiceService', () => ({
  __esModule: true,
  default: { speak: jest.fn(() => Promise.resolve('')) },
}));

jest.mock('../src/robot/RobotController', () => ({
  RobotController: {
    setSpeed: jest.fn(),
    setUseDifferentialDrive: jest.fn(),
  },
}));

const basePrefs = (): NotificationPrefs => ({
  whatsapp: true,
  telegram: true,
  sms: true,
  phone: true,
  other: true,
  announceMode: 'face_only',
  summarizeAlerts: false,
  dndEnabled: false,
  dndStart: '22:00',
  dndEnd: '07:00',
});

describe('NotificationRouter routeLogic', () => {
  it('categorizes WhatsApp vs Telegram separately', () => {
    expect(categorizePackage('com.whatsapp')).toBe('WhatsApp');
    expect(categorizePackage('org.telegram.messenger')).toBe('Telegram');
  });

  it('can disable Telegram without disabling WhatsApp', () => {
    const prefs = { ...basePrefs(), telegram: false };
    const last = new Map<string, number>();
    const wa = routeNotification(
      { packageName: 'com.whatsapp', title: 'Ada', text: 'hi' },
      prefs,
      new Date(),
      last
    );
    const tg = routeNotification(
      { packageName: 'org.telegram.messenger', title: 'Bob', text: 'yo' },
      prefs,
      new Date(),
      last
    );
    expect(wa.accept).toBe(true);
    expect(tg.accept).toBe(false);
    if (!tg.accept) expect(tg.reason).toContain('Telegram');
  });

  it('debounces the same package+title', () => {
    const prefs = basePrefs();
    const last = new Map<string, number>();
    const t0 = new Date('2026-01-01T12:00:00');
    const first = routeNotification(
      { packageName: 'com.whatsapp', title: 'Ada', text: '1' },
      prefs,
      t0,
      last
    );
    expect(first.accept).toBe(true);
    if (first.accept) last.set(first.debounceKey, t0.getTime());

    const second = routeNotification(
      { packageName: 'com.whatsapp', title: 'Ada', text: '2' },
      prefs,
      new Date(t0.getTime() + NOTIFICATION_DEBOUNCE_MS - 10),
      last
    );
    expect(second.accept).toBe(false);
    if (!second.accept) expect(second.reason).toBe('debounce');
  });

  it('DND drops SMS but not calls', () => {
    const prefs = { ...basePrefs(), dndEnabled: true, dndStart: '22:00', dndEnd: '07:00' };
    const night = new Date('2026-01-01T23:30:00');
    const last = new Map<string, number>();

    expect(isInQuietHours(night, prefs)).toBe(true);

    const sms = routeNotification(
      { packageName: 'com.google.android.apps.messaging', title: 'Ada', text: 'hey' },
      prefs,
      night,
      last
    );
    const call = routeNotification(
      {
        packageName: 'com.google.android.dialer',
        title: 'Incoming call',
        category: 'call',
      },
      prefs,
      night,
      last
    );
    expect(sms.accept).toBe(false);
    if (!sms.accept) expect(sms.reason).toBe('dnd');
    expect(call.accept).toBe(true);
    if (call.accept) expect(call.isCall).toBe(true);
  });

  it('does not invoke LLM even when summarizeAlerts is on', async () => {
    const llm = jest.fn(async () => 'summary');
    const result = await maybeSummarizeForLlm('secret body', true, llm);
    expect(result).toBeNull();
    expect(llm).not.toHaveBeenCalled();
  });

  it('face_only hides body in the decision', () => {
    const last = new Map<string, number>();
    const d = routeNotification(
      { packageName: 'com.whatsapp', title: 'Ada', text: 'private' },
      { ...basePrefs(), announceMode: 'face_only' },
      new Date(),
      last
    );
    expect(d.accept).toBe(true);
    if (d.accept) expect(d.showBody).toBe(false);
  });
});

describe('NotificationRouter.ingest call interrupt', () => {
  afterEach(() => {
    NotificationRouter._resetForTests();
  });

  beforeEach(() => {
    mockFollowStop.mockClear();
    mockDanceStop.mockClear();
    mockDispatch.mockClear();
    NotificationRouter._resetForTests();
    const { useSettingsStore } = require('../src/store/useSettingsStore');
    useSettingsStore.setState({
      notifications: {
        whatsapp: true,
        telegram: true,
        sms: true,
        phone: true,
        other: true,
        announceMode: 'face_only',
        summarizeAlerts: false,
        dndEnabled: false,
        dndStart: '22:00',
        dndEnd: '07:00',
      },
    });
  });

  it('stops Follow and Dance on incoming call in the same ingest', () => {
    NotificationRouter.ingest({
      packageName: 'com.google.android.dialer',
      title: 'Ada',
      category: 'call',
      key: 'call-1',
    });
    expect(mockFollowStop).toHaveBeenCalled();
    expect(mockDanceStop).toHaveBeenCalledWith('call');
    expect(mockDispatch).toHaveBeenCalledWith('CALL_START');
  });
});
