import { create } from 'zustand';
import type { CompanionState, TransitionRecord } from '../robot/companionTypes';

interface CompanionStoreState {
  state: CompanionState;
  history: TransitionRecord[];
  lastReason: string | null;
  mirror: (partial: {
    state?: CompanionState;
    history?: TransitionRecord[];
    lastReason?: string | null;
  }) => void;
}

export const useCompanionStore = create<CompanionStoreState>((set) => ({
  state: 'IDLE',
  history: [],
  lastReason: null,
  mirror: (partial) => set((s) => ({ ...s, ...partial })),
}));
