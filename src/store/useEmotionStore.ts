import { create } from 'zustand';

export type EmotionType =
  | 'IDLE'
  | 'HAPPY'
  | 'LISTENING'
  | 'THINKING'
  | 'SPEAKING'
  | 'SURPRISED'
  | 'SLEEPY'
  | 'SAD'
  | 'ANGRY'
  | 'EXCITED';

interface EmotionState {
  currentEmotion: EmotionType;
  isBlinking: boolean;
  isSpeaking: boolean;
  setEmotion: (emotion: EmotionType) => void;
  setBlinking: (blinking: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
  triggerBlink: () => void;
}

let blinkTimer: ReturnType<typeof setTimeout> | null = null;

export const useEmotionStore = create<EmotionState>((set, get) => ({
  currentEmotion: 'IDLE',
  isBlinking: false,
  isSpeaking: false,

  setEmotion: (emotion) => {
    set({ currentEmotion: emotion });
    // If we transition to speaking, update speaking flag
    if (emotion === 'SPEAKING') {
      set({ isSpeaking: true });
    } else if (get().isSpeaking) {
      set({ isSpeaking: false });
    }
  },

  setBlinking: (blinking) => set({ isBlinking: blinking }),
  setSpeaking: (speaking) => set({ isSpeaking: speaking }),

  triggerBlink: () => {
    if (get().isBlinking) return;
    set({ isBlinking: true });
    // Blink duration between 100ms and 200ms
    const blinkDuration = Math.random() * 100 + 100;
    setTimeout(() => {
      set({ isBlinking: false });
    }, blinkDuration);
  },
}));

// Helper to start the random blinking cycle (3 to 8 seconds)
export const startBlinkingLoop = () => {
  if (blinkTimer) return;

  const runBlink = () => {
    useEmotionStore.getState().triggerBlink();
    const nextInterval = Math.random() * 5000 + 3000; // 3 to 8 seconds
    blinkTimer = setTimeout(runBlink, nextInterval);
  };

  const initialInterval = Math.random() * 5000 + 3000;
  blinkTimer = setTimeout(runBlink, initialInterval);
};

export const stopBlinkingLoop = () => {
  if (blinkTimer) {
    clearTimeout(blinkTimer);
    blinkTimer = null;
  }
};
