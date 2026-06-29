import PersonalityEngine from './PersonalityEngine';
import MemoryService from '../memory/MemoryService';
import { useConversationStore } from '../store/useConversationStore';
import { ChatMessage } from './LlmClient';

class ContextBuilder {
  private static instance: ContextBuilder;

  private constructor() {}

  public static getInstance(): ContextBuilder {
    if (!ContextBuilder.instance) {
      ContextBuilder.instance = new ContextBuilder();
    }
    return ContextBuilder.instance;
  }

  /**
   * Constructs the full message payload for the LLM API.
   * Merges system prompt, emotion modifier, memory engine facts, and chat history.
   */
  public buildContext(latestUserMessage: string): ChatMessage[] {
    const messages: ChatMessage[] = [];

    // 1. Core System Prompt (with active emotion state)
    const systemPrompt = PersonalityEngine.getPersonalitySystemPrompt();

    // 2. Local Memory context (Name, Preferences, learned Facts)
    const memoryContext = MemoryService.getMemoryContext();

    // Combine directives into the system message
    const fullSystemMessage = `${systemPrompt}\n\n${memoryContext}`;
    
    messages.push({
      role: 'system',
      content: fullSystemMessage,
    });

    // 3. Conversation History
    const history = useConversationStore.getState().messages;
    
    // Limit to the last 8 exchanges to manage context size and response speed
    const maxHistoryCount = 8;
    const recentHistory = history.slice(-maxHistoryCount);

    recentHistory.forEach((msg) => {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    });

    // 4. Latest user utterance
    messages.push({
      role: 'user',
      content: latestUserMessage,
    });

    return messages;
  }
}

export default ContextBuilder.getInstance();
