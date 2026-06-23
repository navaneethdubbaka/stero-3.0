import { create } from 'zustand';

interface AISettings {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
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
}

export const useSettingsStore = create<SettingsState>((set) => ({
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
  },
  display: {
    faceStyle: 'default',
    brightness: 1.0,
    sleepTimeout: 5, // minutes
  },

  updateAISettings: (settings) =>
    set((state) => ({ ai: { ...state.ai, ...settings } })),
  updateVoiceSettings: (settings) =>
    set((state) => ({ voice: { ...state.voice, ...settings } })),
  updateRobotSettings: (settings) =>
    set((state) => ({ robot: { ...state.robot, ...settings } })),
  updateDisplaySettings: (settings) =>
    set((state) => ({ display: { ...state.display, ...settings } })),
}));
