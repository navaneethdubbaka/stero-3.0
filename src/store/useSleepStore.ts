import { create } from 'zustand';

interface SleepState {
  isAsleep: boolean;
  setAsleep: (asleep: boolean) => void;
}

export const useSleepStore = create<SleepState>((set) => ({
  isAsleep: false,
  setAsleep: (asleep) => set({ isAsleep: asleep }),
}));
