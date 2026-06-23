import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface ConversationState {
  messages: Message[];
  addMessage: (role: 'user' | 'assistant' | 'system', content: string) => void;
  clearConversation: () => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  messages: [],

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
  },

  clearConversation: () => set({ messages: [] }),
}));
