import { createStreamParser } from '../../components/features/format/utils/StreamParser';
// import { StreamResponse } from '../../types/StreamResponse';

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

// Add request caching and timeout management
export class OllamaAPI {
    private static baseUrl = window.env?.OLLAMA_API_URL || 'http://localhost:11434/api';
    private static controller: AbortController | null = null;
    private static requestCache: Map<string, { data: any, timestamp: number }> = new Map();
    private static CACHE_TTL = 60000; // 1 minute cache lifetime
    private static requestTimeouts: Map<string, NodeJS.Timeout> = new Map();
    private static DEFAULT_TIMEOUT = 30000; // 30 second default timeout
    private static concurrentRequests = 0;
    private static MAX_CONCURRENT_REQUESTS = 3; // Maximum concurrent requests
    private static pendingRequests: Array<() => void> = [];
    private static isOffline = false;
    private static retryBackoff = 1000; // Start with 1s backoff, will increase exponentially

    static async generateStream(
        prompt: string, 
        model: string,
        onToken: (token: string) => void,
        onComplete: () => void,
        onError?: (error: Error) => void
    ): Promise<void> {
        try {
            this.controller = new AbortController();
            
            // Increase the timeout for the request to allow for longer generations
            const timeoutId = setTimeout(() => {
                if (this.controller) {
                    this.controller.abort();
                    onError?.(new Error('Request timed out'));
                }
            }, 180000); // Extended to 3 minutes from 2 minutes

            const response = await fetch(`${this.baseUrl}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    model, 
                    prompt, 
                    stream: true,
                    options: {
                        num_ctx: 2048,
                        seed: 42,
                        repeat_penalty: 1.1
                    }
                }),
                signal: this.controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`API responded with status ${response.status}: ${response.statusText}`);
            }
            
            if (!response.body) {
                throw new Error('Response body is null, cannot stream response');
            }

            const reader = response.body.getReader() as unknown as import("stream/web").ReadableStreamDefaultReader<Uint8Array>;
            if (!reader) throw new Error('No readable stream available');

            // Improved stall detection with more lenient parameters
            let lastChunkTime = Date.now();
            let receivedDataSinceLastCheck = false;
            let stallCheckCount = 0;
            let totalBytesReceived = 0;
            
            const streamWatchdog = setInterval(() => {
                const now = Date.now();
                
                // More lenient stall detection:
                // 1. Only consider it stalled after more checks without data (40 seconds total)
                // 2. Reset counter when data is received
                if (receivedDataSinceLastCheck) {
                    stallCheckCount = 0;
                    receivedDataSinceLastCheck = false;
                    lastChunkTime = now;
                } else {
                    stallCheckCount++;
                    
                    // Only force completion after 8 checks (40 seconds) with no data
                    // and only if we've actually received some data already
                    if (stallCheckCount >= 8 && now - lastChunkTime > 40000 && totalBytesReceived > 0) {
                        clearInterval(streamWatchdog);
                        console.warn('Stream appears stalled after extended period, forcing completion');
                        onComplete();
                    }
                }
            }, 5000); // Check every 5 seconds

            const parser = createStreamParser({ 
                onToken: (token) => {
                    receivedDataSinceLastCheck = true;
                    lastChunkTime = Date.now();
                    totalBytesReceived += token.length;
                    onToken(token);
                }, 
                onComplete: () => {
                    // Ensure we clear watchdog and controller before completion callback
                    clearInterval(streamWatchdog);
                    this.controller = null;
                    
                    // Small delay before triggering completion to ensure UI stabilizes
                    setTimeout(() => {
                        onComplete();
                    }, 50);
                },
                onError 
            });
            
            await parser.processStream(reader);
            
            clearInterval(streamWatchdog);
            
            this.isOffline = false;
            this.retryBackoff = 1000;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Generation stopped by user');
                return;
            }
            
            onError?.(error);
            
            // Handle offline mode and connection issues
            if (error instanceof TypeError && 
                (error.message === 'Failed to fetch' || 
                 error.message.includes('ERR_CONNECTION_REFUSED'))) {
                
                this.isOffline = true;
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
        // Use cache if available
        const cacheKey = `generate:${model}:${prompt}`;
        const cached = this.getCachedResponse(cacheKey);
        if (cached) return cached;
        
        const result = await this.post('/generate', { model, prompt });
        this.cacheResponse(cacheKey, result);
        return result;
    }

    static async chatCompletion(messages: ChatMessage[], model: string): Promise<ChatResponse> {
        // Create a deterministic cache key from messages
        const messagesKey = JSON.stringify(messages);
        const cacheKey = `chat:${model}:${messagesKey}`;
        const cached = this.getCachedResponse(cacheKey);
        if (cached) return cached;
        
        const result = await this.post('/chat', { model, messages });
        this.cacheResponse(cacheKey, result);
        return result;
    }

    static async getModels(): Promise<string[]> {
        // Always use cache if available, with longer TTL
        const cacheKey = 'models';
        const cached = this.getCachedResponse(cacheKey, 300000); // 5 min TTL for models list
        if (cached) return cached;
        
        const response = await this.get('/tags');
        const models = response.models?.map((model: { name: string }) => model.name) || [];
        this.cacheResponse(cacheKey, models);
        return models;
    }

    static async getModelInfo(name: string): Promise<ModelInfo> {
        const cacheKey = `model:${name}`;
        const cached = this.getCachedResponse(cacheKey, 3600000); // 1 hour TTL for model info
        if (cached) return cached;
        
        const result = await this.post('/show', { name });
        this.cacheResponse(cacheKey, result);
        return result;
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
        await this.waitForRequestSlot();
        
        try {
            this.concurrentRequests++;
            
            // Add jitter to avoid request thundering herd
            const jitter = Math.random() * 100;
            await new Promise(resolve => setTimeout(resolve, jitter));
            
            const requestId = `get:${endpoint}:${Date.now()}`;
            
            // Set timeout
            const timeoutPromise = new Promise<never>((_, reject) => {
                const timeoutId = setTimeout(() => {
                    this.requestTimeouts.delete(requestId);
                    reject(new Error(`Request timeout for ${endpoint}`));
                }, this.DEFAULT_TIMEOUT);
                
                this.requestTimeouts.set(requestId, timeoutId);
            });
            
            // Create fetch promise
            const fetchPromise = fetch(`${this.baseUrl}${endpoint}`).then(async response => {
                if (!response.ok) {
                    throw new Error(`API error: ${response.statusText}`);
                }
                return await response.json();
            });
            
            // Race between timeout and fetch
            const result = await Promise.race([fetchPromise, timeoutPromise]);
            
            // Clear timeout if fetch completed first
            const timeoutId = this.requestTimeouts.get(requestId);
            if (timeoutId) {
                clearTimeout(timeoutId);
                this.requestTimeouts.delete(requestId);
            }
            
            // Request successful, reset offline status
            this.isOffline = false;
            this.retryBackoff = 1000;
            
            return result;
        } catch (error) {
            if (error instanceof TypeError && 
                (error.message === 'Failed to fetch' || 
                error.message.includes('ERR_CONNECTION_REFUSED'))) {
                
                this.isOffline = true;
                throw new Error('OLLAMA_SERVICE_OFFLINE');
            }
            throw error;
        } finally {
            this.concurrentRequests--;
            this.processNextRequest();
        }
    }

    private static async post(endpoint: string, body: any): Promise<any> {
        await this.waitForRequestSlot();
        
        try {
            this.concurrentRequests++;
            
            const requestId = `post:${endpoint}:${Date.now()}`;
            
            // Set timeout
            const timeoutPromise = new Promise<never>((_, reject) => {
                const timeoutId = setTimeout(() => {
                    this.requestTimeouts.delete(requestId);
                    reject(new Error(`Request timeout for ${endpoint}`));
                }, this.DEFAULT_TIMEOUT);
                
                this.requestTimeouts.set(requestId, timeoutId);
            });
            
            // Create fetch promise
            const fetchPromise = fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }).then(async response => {
                if (!response.ok) {
                    throw new Error(`API error: ${response.statusText}`);
                }
                return await response.json();
            });
            
            // Race between timeout and fetch
            const result = await Promise.race([fetchPromise, timeoutPromise]);
            
            // Clear timeout if fetch completed first
            const timeoutId = this.requestTimeouts.get(requestId);
            if (timeoutId) {
                clearTimeout(timeoutId);
                this.requestTimeouts.delete(requestId);
            }
            
            return result;
        } catch (error) {
            if (error instanceof TypeError && 
                (error.message === 'Failed to fetch' || 
                 error.message.includes('ERR_CONNECTION_REFUSED'))) {
                
                this.isOffline = true;
                throw new Error('OLLAMA_SERVICE_OFFLINE');
            }
            throw error;
        } finally {
            this.concurrentRequests--;
            this.processNextRequest();
        }
    }

    private static async delete(endpoint: string, body: any): Promise<any> {
        await this.waitForRequestSlot();
        
        try {
            this.concurrentRequests++;
            
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
        } catch (error) {
            if (error instanceof TypeError && 
                (error.message === 'Failed to fetch' || 
                error.message.includes('ERR_CONNECTION_REFUSED'))) {
                
                this.isOffline = true;
                throw new Error('OLLAMA_SERVICE_OFFLINE');
            }
            throw error;
        } finally {
            this.concurrentRequests--;
            this.processNextRequest();
        }
    }

    // Cache management methods
    private static getCachedResponse(key: string, customTtl?: number): any | null {
        const cached = this.requestCache.get(key);
        if (!cached) return null;
        
        const ttl = customTtl || this.CACHE_TTL;
        const now = Date.now();
        
        // Check if the cache is still valid
        if (now - cached.timestamp <= ttl) {
            return cached.data;
        }
        
        // Remove expired cache entry
        this.requestCache.delete(key);
        return null;
    }
    
    private static cacheResponse(key: string, data: any): void {
        this.requestCache.set(key, {
            data,
            timestamp: Date.now()
        });
        
        // Limit cache size to prevent memory leaks
        if (this.requestCache.size > 100) {
            // Remove the oldest entry
            const oldestKey = this.requestCache.keys().next().value;
            this.requestCache.delete(oldestKey);
        }
    }
    
    // Request queue management for throttling
    private static waitForRequestSlot(): Promise<void> {
        if (this.concurrentRequests < this.MAX_CONCURRENT_REQUESTS) {
            return Promise.resolve();
        }
        
        return new Promise(resolve => {
            this.pendingRequests.push(resolve);
        });
    }
    
    private static processNextRequest(): void {
        if (this.pendingRequests.length > 0 && 
            this.concurrentRequests < this.MAX_CONCURRENT_REQUESTS) {
            const nextResolve = this.pendingRequests.shift();
            if (nextResolve) {
                nextResolve();
            }
        }
    }
    
    // Add methods to clean up resources
    static cleanup(): void {
        // Clear all timeouts
        for (const timeoutId of this.requestTimeouts.values()) {
            clearTimeout(timeoutId);
        }
        this.requestTimeouts.clear();
        
        // Clear cache if needed
        this.requestCache.clear();
        
        // Reset other state
        this.pendingRequests = [];
        this.concurrentRequests = 0;
    }
}
