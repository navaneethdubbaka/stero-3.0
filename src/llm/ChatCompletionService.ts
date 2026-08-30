import LlmClient, {
  ChatMessage,
  VisionImageUnsupportedError,
} from './LlmClient';
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
    return this.runCompletion(messages, ai.model);
  }

  /**
   * Multimodal completion for Vision AI. Uses ai.visionModel when set, else ai.model.
   */
  public async generateVisionCompletion(
    messages: ChatMessage[],
    options?: { model?: string }
  ): Promise<string> {
    const { ai } = useSettingsStore.getState();
    const model =
      (options?.model && options.model.trim()) ||
      (ai.visionModel && ai.visionModel.trim()) ||
      ai.model;
    return this.runCompletion(messages, model);
  }

  private async runCompletion(messages: ChatMessage[], model: string): Promise<string> {
    const { ai } = useSettingsStore.getState();
    const conversationStore = useConversationStore.getState();

    try {
      const response = await LlmClient.createChatCompletion(ai.baseUrl, ai.apiKey, {
        model,
        messages,
        temperature: ai.temperature,
        max_tokens: ai.maxTokens,
      });

      const choice = response.choices?.[0];
      const reply = choice?.message?.content;

      if (reply === undefined || reply === null) {
        throw new Error('LLM Response returned an empty choices payload.');
      }

      return typeof reply === 'string' ? reply : String(reply);
    } catch (error: any) {
      console.error('ChatCompletionService: Error generating completion:', error);

      conversationStore.addError(
        error.message || 'LLM completion request failed.',
        `Base URL: ${ai.baseUrl}\nModel: ${model}\nTimestamp: ${new Date().toLocaleString()}`
      );

      if (error instanceof VisionImageUnsupportedError) {
        throw error;
      }
      throw error;
    }
  }
}

export { VisionImageUnsupportedError };
export default ChatCompletionService.getInstance();
