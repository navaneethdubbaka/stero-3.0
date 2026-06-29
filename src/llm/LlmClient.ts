export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

class LlmClient {
  private static instance: LlmClient;

  private constructor() {}

  public static getInstance(): LlmClient {
    if (!LlmClient.instance) {
      LlmClient.instance = new LlmClient();
    }
    return LlmClient.instance;
  }

  private getHeaders(apiKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey && apiKey.trim().length > 0) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }
    return headers;
  }

  /**
   * Fetches the list of available models from the provider.
   */
  public async getModels(baseUrl: string, apiKey?: string): Promise<string[]> {
    const formattedUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${formattedUrl}/models`;
    
    console.log(`LlmClient: Fetching models from ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(apiKey),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // OpenAI and compatible APIs return list of model objects under "data" property
    if (data && Array.isArray(data.data)) {
      return data.data.map((m: any) => m.id);
    } else if (data && Array.isArray(data)) {
      // Direct array returns fallback
      return data.map((m: any) => m.id || m.name || String(m));
    }
    
    return [];
  }

  /**
   * Sends a completion request to the chat/completions endpoint.
   */
  public async createChatCompletion(
    baseUrl: string,
    apiKey: string | undefined,
    request: ChatCompletionRequest
  ): Promise<any> {
    const formattedUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${formattedUrl}/chat/completions`;

    console.log(`LlmClient: Sending chat completion request to ${url} for model: ${request.model}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(apiKey),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Chat completion failed: ${response.status} ${response.statusText}. Details: ${errorText}`);
    }

    const responseData = await response.json();
    return responseData;
  }
}

export default LlmClient.getInstance();
