import { create } from 'zustand';
import { Storage, KEYS } from '../memory/Storage';

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

/** Max messages kept on disk / in store (Page 8). LLM still uses last 8. */
export const MAX_STORED_MESSAGES = 50;

interface ConversationState {
  messages: Message[];
  apiErrors: ApiError[];
  addMessage: (role: 'user' | 'assistant' | 'system', content: string) => void;
  clearConversation: () => void;
  addError: (message: string, details?: string) => void;
  clearErrors: () => void;
  trimMessages: () => void;
  exportRecent: (n?: number) => Message[];
  initializeLogs: () => Promise<void>;
}

const persist = async () => {
  const { messages, apiErrors } = useConversationStore.getState();
  await Storage.setJson(KEYS.chatLogs, { messages, apiErrors });
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
      messages: [...state.messages, newMessage].slice(-MAX_STORED_MESSAGES),
    }));
    void persist();
  },

  clearConversation: () => {
    set({ messages: [] });
    void persist();
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
    void persist();
  },

  clearErrors: () => {
    set({ apiErrors: [] });
    void persist();
  },

  trimMessages: () => {
    const { messages } = get();
    if (messages.length <= MAX_STORED_MESSAGES) return;
    set({ messages: messages.slice(-MAX_STORED_MESSAGES) });
    void persist();
  },

  exportRecent: (n = MAX_STORED_MESSAGES) => {
    const { messages } = get();
    return messages.slice(-Math.max(1, n));
  },

  initializeLogs: async () => {
    try {
      const parsed = await Storage.getJson<{
        messages?: Message[];
        apiErrors?: ApiError[];
      }>(KEYS.chatLogs);
      if (!parsed) return;
      const messages = (parsed.messages || []).slice(-MAX_STORED_MESSAGES);
      set(() => ({
        messages,
        apiErrors: parsed.apiErrors || [],
      }));
    } catch (e) {
      console.error('Failed to initialize chat logs from Storage:', e);
    }
  },
}));
