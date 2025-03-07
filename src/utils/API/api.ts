import { createStreamParser } from '../../components/features/format/utils/StreamParser';

interface GenerateResponse {
    response: string;
    error?: string;
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
    details: {
        format: string;
        families: string[];
        parameter_size: string;
        quantization_level: string;
    };
    license: string[];
    template: string;
    parameters: Record<string, any>;
}

// interface StreamResponse {
//     model: string;
//     created_at: string;
//     response: string;
//     done: boolean;
//     context?: number[];
// }

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

export class OllamaAPI {
    private static baseUrl = window.env?.OLLAMA_API_URL || 'http://localhost:11434/api';
    private static controller: AbortController | null = null;

    // Currently used methods
    static async generateStream(
        prompt: string, 
        model: string,
        onToken: (token: string) => void,
        onComplete: () => void,
        onError?: (error: Error) => void
    ): Promise<void> {
        try {
            this.controller = new AbortController();

            const response = await fetch(`${this.baseUrl}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, prompt, stream: true }),
                signal: this.controller.signal
            });

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No readable stream available');

            const parser = createStreamParser({ onToken, onComplete, onError });
            await parser.processStream(reader);
        } catch (error) {
            if (error.name === 'AbortError') {
                // Handle abort gracefully
                console.log('Generation stopped by user');
                return;
            }
            onError?.(error);
            if (error instanceof TypeError && 
                (error.message === 'Failed to fetch' || 
                 error.message.includes('ERR_CONNECTION_REFUSED'))) {
                throw new Error('OLLAMA_SERVICE_OFFLINE');
            }
            console.error('Stream error:', error);
            throw error;
        } finally {
            this.controller = null;
        }
    }

    static stopGeneration(): void {
        if (this.controller) {
            this.controller.abort();
            this.controller = null;
        }
    }

    static async generateResponse(prompt: string, model: string): Promise<GenerateResponse> {
        return await this.post('/generate', { model, prompt });
    }

    static async chatCompletion(messages: ChatMessage[], model: string): Promise<ChatResponse> {
        return await this.post('/chat', { model, messages });
    }

    static async getModels(): Promise<string[]> {
        const response = await this.get('/tags');
        return response.models?.map((model: { name: string }) => model.name) || [];
    }

    static async getModelInfo(name: string): Promise<ModelInfo> {
        return await this.post('/show', { name });
    }

    static async copyModel(source: string, destination: string): Promise<void> {
        await this.post('/copy', { source, destination });
    }

    static async createModel(name: string, path: string): Promise<void> {
        await this.post('/create', { name, path });
    }

    static async deleteModel(name: string): Promise<void> {
        await this.delete('/delete', { name });
    }

    static async pullModel(name: string): Promise<void> {
        await this.post('/pull', { name });
    }

    static async pushModel(name: string): Promise<void> {
        await this.post('/push', { name });
    }

    static async generateEmbeddings(text: string, model: string): Promise<EmbeddingsResponse> {
        return await this.post('/embeddings', { model, prompt: text });
    }

    static async getRunningModels(): Promise<RunningModel[]> {
        const response = await this.get('/running');
        return response.running || [];
    }

    static async getVersion(): Promise<VersionInfo> {
        return await this.get('/version');
    }

    private static async get(endpoint: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`);
            if (!response.ok) {
                throw new Error(`API error: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            if (error instanceof TypeError && 
                (error.message === 'Failed to fetch' || 
                error.message.includes('ERR_CONNECTION_REFUSED'))) {
                throw new Error('OLLAMA_SERVICE_OFFLINE');
            }
            throw error;
        }
    }

    private static async post(endpoint: string, body: any): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                throw new Error(`API error: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            if (error instanceof TypeError && 
                (error.message === 'Failed to fetch' || 
                 error.message.includes('ERR_CONNECTION_REFUSED'))) {
                throw new Error('OLLAMA_SERVICE_OFFLINE');
            }
            throw error;
        }
    }

    private static async delete(endpoint: string, body: any): Promise<any> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }
        return await response.json();
    }
}
