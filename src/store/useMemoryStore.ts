import { create } from 'zustand';
import { Storage, KEYS } from '../memory/Storage';

export interface MemoryState {
  userName: string;
  userPreferences: string;
  facts: string[];
  friendshipLevel: number;
  setUserName: (name: string) => void;
  setUserPreferences: (prefs: string) => void;
  addFact: (fact: string) => void;
  removeFact: (fact: string) => void;
  updateFriendshipLevel: (level: number) => void;
  clearMemory: () => void;
  initializeMemory: () => Promise<void>;
}

const persist = async () => {
  const { userName, userPreferences, facts, friendshipLevel } =
    useMemoryStore.getState();
  await Storage.setJson(KEYS.robotMemory, {
    userName,
    userPreferences,
    facts,
    friendshipLevel,
  });
};

export const useMemoryStore = create<MemoryState>((set, get) => ({
  userName: '',
  userPreferences: '',
  facts: [],
  friendshipLevel: 50,

  setUserName: (name) => {
    set({ userName: name });
    void persist();
  },

  setUserPreferences: (prefs) => {
    set({ userPreferences: prefs });
    void persist();
  },

  addFact: (fact) => {
    const trimmed = fact.trim();
    if (!trimmed) return;
    set((state) => {
      if (state.facts.includes(trimmed)) return state;
      return { facts: [...state.facts, trimmed] };
    });
    void persist();
  },

  removeFact: (factToRemove) => {
    set((state) => ({
      facts: state.facts.filter((f) => f !== factToRemove),
    }));
    void persist();
  },

  updateFriendshipLevel: (level) => {
    set({ friendshipLevel: Math.max(0, Math.min(100, level)) });
    void persist();
  },

  clearMemory: () => {
    set({
      userName: '',
      userPreferences: '',
      facts: [],
      friendshipLevel: 50,
    });
    void persist();
  },

  initializeMemory: async () => {
    try {
      const parsed = await Storage.getJson<{
        userName?: string;
        userPreferences?: string;
        facts?: string[];
        friendshipLevel?: number;
      }>(KEYS.robotMemory);
      if (!parsed) return;
      set((state) => ({
        userName: parsed.userName ?? state.userName,
        userPreferences: parsed.userPreferences ?? state.userPreferences,
        facts: parsed.facts ?? state.facts,
        friendshipLevel: parsed.friendshipLevel ?? state.friendshipLevel,
      }));
    } catch (e) {
      console.error('Failed to initialize memory from Storage:', e);
    }
  },
}));
