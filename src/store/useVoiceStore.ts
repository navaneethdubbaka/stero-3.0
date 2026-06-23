import { create } from 'zustand';

interface VoiceState {
  isListening: boolean;
  wakeWordDetected: boolean;
  recognizedText: string;
  setListening: (listening: boolean) => void;
  setWakeWordDetected: (detected: boolean) => void;
  setRecognizedText: (text: string) => void;
  resetVoiceState: () => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  isListening: false,
  wakeWordDetected: false,
  recognizedText: '',

  setListening: (listening) => set({ isListening: listening }),
  setWakeWordDetected: (detected) => set({ wakeWordDetected: detected }),
  setRecognizedText: (text) => set({ recognizedText: text }),
  resetVoiceState: () => set({ isListening: false, wakeWordDetected: false, recognizedText: '' }),
}));
