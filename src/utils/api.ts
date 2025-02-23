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

    static async generateResponse(prompt: string, model: string): Promise<GenerateResponse> {
        return await this.post('/generate', { model, prompt });
    }

    static async chatCompletion(messages: ChatMessage[], model: string): Promise<ChatResponse> {
        return await this.post('/chat', { model, messages });
    }

    // static async createModel(name: string, path: string): Promise<void> {
    //     await this.post('/create', { name, path });
    // }

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

    // static async deleteModel(name: string): Promise<void> {
    //     await this.delete('/delete', { name });
    // }

    // static async pullModel(name: string): Promise<void> {
    //     await this.post('/pull', { name });
    // }

    // static async pushModel(name: string): Promise<void> {
    //     await this.post('/push', { name });
    // }

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
        const response = await fetch(`${this.baseUrl}${endpoint}`);
        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }
        return await response.json();
    }

    private static async post(endpoint: string, body: any): Promise<any> {
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
    }

    // private static async delete(endpoint: string, body: any): Promise<any> {
    //     const response = await fetch(`${this.baseUrl}${endpoint}`, {
    //         method: 'DELETE',
    //         headers: {
    //             'Content-Type': 'application/json',
    //         },
    //         body: JSON.stringify(body),
    //     });
    //     if (!response.ok) {
    //         throw new Error(`API error: ${response.statusText}`);
    //     }
    //     return await response.json();
    // }
}
