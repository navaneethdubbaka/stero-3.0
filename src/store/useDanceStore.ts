import { create } from 'zustand';

export type DanceRoutineId = 'spin_happy' | 'wiggle';
export type DanceStatus = 'OFF' | 'PLAYING' | 'ABORT';

interface DanceState {
  enabled: boolean;
  routineId: DanceRoutineId | null;
  status: DanceStatus;
  mirror: (partial: {
    enabled?: boolean;
    routineId?: DanceRoutineId | null;
    status?: DanceStatus;
  }) => void;
  reset: () => void;
}

export const useDanceStore = create<DanceState>((set) => ({
  enabled: false,
  routineId: null,
  status: 'OFF',

  mirror: (partial) => set((s) => ({ ...s, ...partial })),
  reset: () => set({ enabled: false, routineId: null, status: 'OFF' }),
}));
