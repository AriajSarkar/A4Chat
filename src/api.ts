// Basic interfaces
interface GenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
}

interface GenerateResponse {
  response: string;
  error?: string;
}

interface StreamResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  message: ChatMessage;
  error?: string;
}

interface ModelInfo {
  name: string;
  details?: {
    format: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
  license?: string[];
  template?: string;
  parameters?: Record<string, any>;
  modified_at?: string;
  size?: number;
}

interface ModelsResponse {
  models: ModelInfo[];
}

interface EmbeddingsResponse {
  embedding: number[];
  error?: string;
}

interface RunningModel {
  name: string;
  timestamp: string;
}

interface VersionInfo {
  version: string;
}

class OllamaAPI {
  private baseUrl = window.env?.OLLAMA_API_URL || 'http://localhost:11434/api';

  private async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      console.error('API Error:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
      });
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  private async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return response.json();
  }

  // Currently used methods
  async generateStream(
    prompt: string, 
    model: string,
    onToken: (token: string) => void,
    onComplete: () => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: true }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data: StreamResponse = JSON.parse(line);
            if (data.response && !data.response.includes('<think>') && 
                !data.response.includes('</think>') && data.response.trim()) {
              onToken(data.response);
            }
            if (data.done) {
              onComplete();
              break;
            }
          } catch (e) {
            console.error('Error parsing stream response:', e);
          }
        }
      }
    } catch (error) {
      console.error('Stream error:', error);
      throw error;
    }
  }

  async listModels(): Promise<string[]> {
    const data = await this.get<ModelsResponse>('/tags');
    return data.models.map(model => model.name);
  }

  // Methods for future use
  async generate(prompt: string, model: string): Promise<GenerateResponse> {
    return this.post<GenerateResponse>('/generate', { model, prompt });
  }

  async chatCompletion(messages: ChatMessage[], model: string): Promise<ChatResponse> {
    return this.post<ChatResponse>('/chat', { model, messages });
  }

  async getModelInfo(name: string): Promise<ModelInfo> {
    return this.post<ModelInfo>('/show', { name });
  }

  async copyModel(source: string, destination: string): Promise<void> {
    await this.post('/copy', { source, destination });
  }

  async generateEmbeddings(text: string, model: string): Promise<EmbeddingsResponse> {
    return this.post<EmbeddingsResponse>('/embeddings', { model, prompt: text });
  }

  async getRunningModels(): Promise<RunningModel[]> {
    const response = await this.get<{ running: RunningModel[] }>('/running');
    return response.running || [];
  }

  async getVersion(): Promise<VersionInfo> {
    return this.get<VersionInfo>('/version');
  }
}

export const ollamaAPI = new OllamaAPI();
