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

interface StreamResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
    context?: number[];
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

export class OllamaAPI {
    private static baseUrl = window.env.OLLAMA_API_URL;

    // Currently used methods
    static async generateStream(
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
            if (error instanceof TypeError && 
                (error.message === 'Failed to fetch' || 
                 error.message.includes('ERR_CONNECTION_REFUSED'))) {
                throw new Error('OLLAMA_SERVICE_OFFLINE');
            }
            console.error('Stream error:', error);
            throw error;
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
