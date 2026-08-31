import { create } from 'zustand';
import { RobotController } from '../robot/RobotController';
import { Storage, KEYS } from '../memory/Storage';
import type { AnnounceMode, NotificationPrefs } from '../notifications/routeLogic';

interface AISettings {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  /** When false, vision questions use pose-text fallback only (no still upload). */
  allowVisionAi: boolean;
  /** Long-edge max for JPEG stills sent to the LLM. */
  visionMaxEdgePx: number;
  /** Optional vision-capable model override; empty = use `model`. */
  visionModel: string;
  /** When true, native layer may write JPEG to app cache for debugging. */
  debugSaveVisionStills: boolean;
}

interface VoiceSettings {
  wakeWord: string;
  voice: string;
  speechRate: number;
  volume: number;
}

interface RobotSettings {
  followDistance: number;
  trackingSensitivity: number;
  motorSpeed: number;
  /** When true, RobotController may emit Protocol v2.1 M:left,right */
  useDifferentialDrive: boolean;
  /** Follow curve max PWM (clamped to motorSpeed at apply time). */
  followMaxPwm: number;
  /** Follow curve / spin floor PWM. */
  followMinPwm: number;
  /** How hard lateral offset maps to left/right delta. */
  curveGain: number;
  /** Max continuous spin-in-place before forced stop (ms). */
  maxRotateBurstMs: number;
}

interface DisplaySettings {
  faceStyle: string;
  brightness: number;
  sleepTimeout: number; // in minutes
}

interface SettingsState {
  ai: AISettings;
  voice: VoiceSettings;
  robot: RobotSettings;
  display: DisplaySettings;
  notifications: NotificationPrefs;
  updateAISettings: (settings: Partial<AISettings>) => void;
  updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  updateRobotSettings: (settings: Partial<RobotSettings>) => void;
  updateDisplaySettings: (settings: Partial<DisplaySettings>) => void;
  updateNotificationSettings: (settings: Partial<NotificationPrefs>) => void;
  initializeSettings: () => Promise<void>;
}

const persistSettings = async (state: SettingsState) => {
  await Storage.setJson(KEYS.settings, {
    ai: state.ai,
    voice: state.voice,
    robot: state.robot,
    display: state.display,
    notifications: state.notifications,
  });
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ai: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 500,
    systemPrompt: `You are ABIOGENESIS.
You are a friendly robotic companion.
You are expressive and helpful.
Keep responses very concise, conversational, and direct.`,
    allowVisionAi: true,
    visionMaxEdgePx: 768,
    visionModel: '',
    debugSaveVisionStills: false,
  },
  voice: {
    wakeWord: 'Sonic',
    voice: 'en-us-x-sfg#female_1-local',
    speechRate: 1.0,
    volume: 1.0,
  },
  robot: {
    followDistance: 1.0, // meters
    trackingSensitivity: 0.5,
    motorSpeed: 150,
    useDifferentialDrive: true,
    followMaxPwm: 180,
    followMinPwm: 80,
    curveGain: 1.0,
    maxRotateBurstMs: 2500,
  },
  display: {
    faceStyle: 'default',
    brightness: 1.0,
    sleepTimeout: 5, // minutes
  },
  notifications: {
    whatsapp: true,
    telegram: true,
    sms: true,
    phone: true,
    other: true,
    announceMode: 'face_only' as AnnounceMode,
    summarizeAlerts: false,
    dndEnabled: false,
    dndStart: '22:00',
    dndEnd: '07:00',
  },

  updateAISettings: (settings) => {
    set((state) => ({ ai: { ...state.ai, ...settings } }));
    void persistSettings(get());
  },
  updateVoiceSettings: (settings) => {
    set((state) => ({ voice: { ...state.voice, ...settings } }));
    void persistSettings(get());
  },
  updateRobotSettings: (settings) => {
    set((state) => ({ robot: { ...state.robot, ...settings } }));
    void persistSettings(get());

    if (settings.motorSpeed !== undefined) {
      RobotController.setSpeed(settings.motorSpeed);
    }
    if (settings.useDifferentialDrive !== undefined) {
      RobotController.setUseDifferentialDrive(settings.useDifferentialDrive);
    }
  },
  updateDisplaySettings: (settings) => {
    set((state) => ({ display: { ...state.display, ...settings } }));
    void persistSettings(get());
  },
  updateNotificationSettings: (settings) => {
    set((state) => ({ notifications: { ...state.notifications, ...settings } }));
    void persistSettings(get());
  },
  initializeSettings: async () => {
    try {
      const parsed = await Storage.getJson<{
        ai?: Partial<AISettings>;
        voice?: Partial<VoiceSettings>;
        robot?: Partial<RobotSettings> & Record<string, unknown>;
        display?: Partial<DisplaySettings>;
        notifications?: Partial<NotificationPrefs>;
      }>(KEYS.settings);
      if (!parsed) return;

      const savedRobot = parsed.robot ?? {};
      // Respect explicit false; otherwise default true (Page 11).
      const useDiff =
        savedRobot.useDifferentialDrive !== undefined
          ? !!savedRobot.useDifferentialDrive
          : true;

      set((state) => ({
        ai: {
          ...state.ai,
          ...parsed.ai,
          allowVisionAi: parsed.ai?.allowVisionAi ?? state.ai.allowVisionAi,
          visionMaxEdgePx: parsed.ai?.visionMaxEdgePx ?? state.ai.visionMaxEdgePx,
          visionModel: parsed.ai?.visionModel ?? state.ai.visionModel,
          debugSaveVisionStills:
            parsed.ai?.debugSaveVisionStills ?? state.ai.debugSaveVisionStills,
        },
        voice: { ...state.voice, ...parsed.voice },
        robot: {
          ...state.robot,
          ...savedRobot,
          useDifferentialDrive: useDiff,
          followMaxPwm:
            typeof savedRobot.followMaxPwm === 'number'
              ? savedRobot.followMaxPwm
              : state.robot.followMaxPwm,
          followMinPwm:
            typeof savedRobot.followMinPwm === 'number'
              ? savedRobot.followMinPwm
              : state.robot.followMinPwm,
          curveGain:
            typeof savedRobot.curveGain === 'number'
              ? savedRobot.curveGain
              : state.robot.curveGain,
          maxRotateBurstMs:
            typeof savedRobot.maxRotateBurstMs === 'number'
              ? savedRobot.maxRotateBurstMs
              : state.robot.maxRotateBurstMs,
        },
        display: { ...state.display, ...parsed.display },
        notifications: {
          ...state.notifications,
          ...parsed.notifications,
          summarizeAlerts: parsed.notifications?.summarizeAlerts ?? false,
        },
      }));

      RobotController.setUseDifferentialDrive(useDiff);
    } catch (e) {
      console.error('Failed to initialize settings from Storage:', e);
    }
  },
}));
