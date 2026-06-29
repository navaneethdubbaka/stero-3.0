import LlmClient from './LlmClient';

class ModelDiscovery {
  private static instance: ModelDiscovery;

  private constructor() {}

  public static getInstance(): ModelDiscovery {
    if (!ModelDiscovery.instance) {
      ModelDiscovery.instance = new ModelDiscovery();
    }
    return ModelDiscovery.instance;
  }

  /**
   * Fetches models from the provider and returns a sorted list of model IDs.
   */
  public async discoverModels(baseUrl: string, apiKey?: string): Promise<string[]> {
    try {
      const models = await LlmClient.getModels(baseUrl, apiKey);
      
      // Filter out typical non-chat models if any, e.g. text-embedding, tts, whisper, dall-e
      const chatModels = models.filter((modelId) => {
        const idLower = modelId.toLowerCase();
        return (
          !idLower.includes('embedding') &&
          !idLower.includes('whisper') &&
          !idLower.includes('dall-e') &&
          !idLower.includes('tts') &&
          !idLower.includes('moderation') &&
          !idLower.includes('edit')
        );
      });

      // Sort alphabetically
      return chatModels.sort((a, b) => a.localeCompare(b));
    } catch (e) {
      console.warn('ModelDiscovery: Failed to discover models:', e);
      throw e;
    }
  }
}

export default ModelDiscovery.getInstance();
