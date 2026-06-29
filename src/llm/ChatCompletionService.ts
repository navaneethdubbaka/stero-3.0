import LlmClient, { ChatMessage } from './LlmClient';
import { useSettingsStore } from '../store/useSettingsStore';
import { useConversationStore } from '../store/useConversationStore';

class ChatCompletionService {
  private static instance: ChatCompletionService;

  private constructor() {}

  public static getInstance(): ChatCompletionService {
    if (!ChatCompletionService.instance) {
      ChatCompletionService.instance = new ChatCompletionService();
    }
    return ChatCompletionService.instance;
  }

  /**
   * Generates a chat completion response using credentials configured in the settings store.
   * On failure, logs the error details inside the conversation store error list.
   */
  public async generateCompletion(messages: ChatMessage[]): Promise<string> {
    const { ai } = useSettingsStore.getState();
    const conversationStore = useConversationStore.getState();

    try {
      const response = await LlmClient.createChatCompletion(ai.baseUrl, ai.apiKey, {
        model: ai.model,
        messages: messages,
        temperature: ai.temperature,
        max_tokens: ai.maxTokens,
      });

      const choice = response.choices?.[0];
      const reply = choice?.message?.content;

      if (reply === undefined || reply === null) {
        throw new Error('LLM Response returned an empty choices payload.');
      }

      return reply;
    } catch (error: any) {
      console.error('ChatCompletionService: Error generating completion:', error);
      
      // Log error internally for diagnostic tab
      conversationStore.addError(
        error.message || 'LLM completion request failed.',
        `Base URL: ${ai.baseUrl}\nModel: ${ai.model}\nTimestamp: ${new Date().toLocaleString()}`
      );
      
      throw error;
    }
  }
}

export default ChatCompletionService.getInstance();
