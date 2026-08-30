import { create } from 'zustand';

export type FollowStatus = 'OFF' | 'SEARCHING' | 'FOLLOWING' | 'HOLD';

interface FollowState {
  enabled: boolean;
  status: FollowStatus;
  lastCommand: 'F' | 'B' | 'L' | 'R' | 'S';
  setEnabled: (enabled: boolean) => void;
  setStatus: (status: FollowStatus) => void;
  setLastCommand: (cmd: 'F' | 'B' | 'L' | 'R' | 'S') => void;
  mirror: (partial: {
    enabled?: boolean;
    status?: FollowStatus;
    lastCommand?: 'F' | 'B' | 'L' | 'R' | 'S';
  }) => void;
  reset: () => void;
}

export const useFollowStore = create<FollowState>((set) => ({
  enabled: false,
  status: 'OFF',
  lastCommand: 'S',

  setEnabled: (enabled) => set({ enabled }),
  setStatus: (status) => set({ status }),
  setLastCommand: (lastCommand) => set({ lastCommand }),
  mirror: (partial) => set((state) => ({ ...state, ...partial })),
  reset: () => set({ enabled: false, status: 'OFF', lastCommand: 'S' }),
}));
