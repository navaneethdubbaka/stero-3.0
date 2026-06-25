import { create } from 'zustand';
import { NativeModules } from 'react-native';

const { SharedPrefs } = NativeModules;

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ApiError {
  id: string;
  message: string;
  timestamp: number;
  details?: string;
}

interface ConversationState {
  messages: Message[];
  apiErrors: ApiError[];
  addMessage: (role: 'user' | 'assistant' | 'system', content: string) => void;
  clearConversation: () => void;
  addError: (message: string, details?: string) => void;
  clearErrors: () => void;
  initializeLogs: () => Promise<void>;
}

const saveToStorage = async (state: any) => {
  try {
    const payload = JSON.stringify({
      messages: state.messages,
      apiErrors: state.apiErrors,
    });
    await SharedPrefs.setString('chat_logs', payload);
  } catch (e) {
    console.error('Failed to save chat logs to SharedPrefs:', e);
  }
};

export const useConversationStore = create<ConversationState>((set, get) => ({
  messages: [],
  apiErrors: [],

  addMessage: (role, content) => {
    const newMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role,
      content,
      timestamp: Date.now(),
    };
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
    saveToStorage(get());
  },

  clearConversation: () => {
    set({ messages: [] });
    saveToStorage(get());
  },

  addError: (message, details) => {
    const newError: ApiError = {
      id: Math.random().toString(36).substring(7),
      message,
      timestamp: Date.now(),
      details,
    };
    set((state) => ({
      apiErrors: [...state.apiErrors, newError],
    }));
    saveToStorage(get());
  },

  clearErrors: () => {
    set({ apiErrors: [] });
    saveToStorage(get());
  },

  initializeLogs: async () => {
    try {
      const data = await SharedPrefs.getString('chat_logs', '');
      if (data) {
        const parsed = JSON.parse(data);
        set(() => ({
          messages: parsed.messages || [],
          apiErrors: parsed.apiErrors || [],
        }));
      }
    } catch (e) {
      console.error('Failed to initialize chat logs from SharedPrefs:', e);
    }
  },
}));
