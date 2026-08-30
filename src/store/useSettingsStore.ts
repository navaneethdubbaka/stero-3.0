import { create } from 'zustand';
import { RobotController } from '../robot/RobotController';
import { Storage, KEYS } from '../memory/Storage';

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
  /** When true, RobotController may emit Protocol v2 M:left,right */
  useDifferentialDrive: boolean;
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
  updateAISettings: (settings: Partial<AISettings>) => void;
  updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  updateRobotSettings: (settings: Partial<RobotSettings>) => void;
  updateDisplaySettings: (settings: Partial<DisplaySettings>) => void;
  initializeSettings: () => Promise<void>;
}

const persistSettings = async (state: SettingsState) => {
  await Storage.setJson(KEYS.settings, {
    ai: state.ai,
    voice: state.voice,
    robot: state.robot,
    display: state.display,
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
    useDifferentialDrive: false,
  },
  display: {
    faceStyle: 'default',
    brightness: 1.0,
    sleepTimeout: 5, // minutes
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
  initializeSettings: async () => {
    try {
      const parsed = await Storage.getJson<{
        ai?: Partial<AISettings>;
        voice?: Partial<VoiceSettings>;
        robot?: Partial<RobotSettings>;
        display?: Partial<DisplaySettings>;
      }>(KEYS.settings);
      if (!parsed) return;
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
          ...parsed.robot,
          useDifferentialDrive:
            parsed.robot?.useDifferentialDrive ?? state.robot.useDifferentialDrive,
        },
        display: { ...state.display, ...parsed.display },
      }));
    } catch (e) {
      console.error('Failed to initialize settings from Storage:', e);
    }
  },
}));
