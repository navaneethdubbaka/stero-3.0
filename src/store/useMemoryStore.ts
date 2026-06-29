import { create } from 'zustand';
import { NativeModules } from 'react-native';

const { SharedPrefs } = NativeModules;

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
  initializeMemory: () => Promise<void>;
}

const saveToStorage = async (state: Omit<MemoryState, 'setUserName' | 'setUserPreferences' | 'addFact' | 'removeFact' | 'updateFriendshipLevel' | 'initializeMemory'>) => {
  try {
    const payload = JSON.stringify({
      userName: state.userName,
      userPreferences: state.userPreferences,
      facts: state.facts,
      friendshipLevel: state.friendshipLevel,
    });
    await SharedPrefs.setString('robot_memory', payload);
  } catch (e) {
    console.error('Failed to save memory to SharedPrefs:', e);
  }
};

export const useMemoryStore = create<MemoryState>((set, get) => ({
  userName: '',
  userPreferences: '',
  facts: [],
  friendshipLevel: 50, // Starts neutral

  setUserName: (name) => {
    set({ userName: name });
    const { userName, userPreferences, facts, friendshipLevel } = get();
    saveToStorage({ userName, userPreferences, facts, friendshipLevel });
  },

  setUserPreferences: (prefs) => {
    set({ userPreferences: prefs });
    const { userName, userPreferences, facts, friendshipLevel } = get();
    saveToStorage({ userName, userPreferences, facts, friendshipLevel });
  },

  addFact: (fact) => {
    const trimmed = fact.trim();
    if (!trimmed) return;
    set((state) => {
      // Avoid duplicate facts
      if (state.facts.includes(trimmed)) return state;
      return { facts: [...state.facts, trimmed] };
    });
    const { userName, userPreferences, facts, friendshipLevel } = get();
    saveToStorage({ userName, userPreferences, facts, friendshipLevel });
  },

  removeFact: (factToRemove) => {
    set((state) => ({
      facts: state.facts.filter((f) => f !== factToRemove),
    }));
    const { userName, userPreferences, facts, friendshipLevel } = get();
    saveToStorage({ userName, userPreferences, facts, friendshipLevel });
  },

  updateFriendshipLevel: (level) => {
    set({ friendshipLevel: Math.max(0, Math.min(100, level)) });
    const { userName, userPreferences, facts, friendshipLevel } = get();
    saveToStorage({ userName, userPreferences, facts, friendshipLevel });
  },

  initializeMemory: async () => {
    try {
      const data = await SharedPrefs.getString('robot_memory', '');
      if (data) {
        const parsed = JSON.parse(data);
        set((state) => ({
          userName: parsed.userName ?? state.userName,
          userPreferences: parsed.userPreferences ?? state.userPreferences,
          facts: parsed.facts ?? state.facts,
          friendshipLevel: parsed.friendshipLevel ?? state.friendshipLevel,
        }));
      }
    } catch (e) {
      console.error('Failed to initialize memory from SharedPrefs:', e);
    }
  },
}));
