interface StreamResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
    context?: number[];
}

interface StreamParserCallbacks {
    onToken: (token: string) => void;
    onComplete: () => void;
    onError?: (error: Error) => void;
}

export class StreamParser {
    private decoder: TextDecoder;
    private callbacks: StreamParserCallbacks;

    constructor(callbacks: StreamParserCallbacks) {
        this.decoder = new TextDecoder();
        this.callbacks = callbacks;
    }

    /**
     * Process a stream of data from an AI response
     * @param reader ReadableStreamDefaultReader to read data from
     * @returns Promise that resolves when stream is complete
     */
    async processStream(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
        try {
            let streamActive = true;
            while (streamActive) {
                const { value, done } = await reader.read();
                if (done) {
                    streamActive = false;
                    continue;
                }

                const chunk = this.decoder.decode(value);
                await this.parseChunk(chunk);
            }
        } catch (error) {
            if (error instanceof Error) {
                this.callbacks.onError?.(error);
            }
            throw error;
        }
    }

    /**
     * Parse a chunk of streamed data
     * @param chunk String chunk of data to parse
     */
    private async parseChunk(chunk: string): Promise<void> {
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
            try {
                const data: StreamResponse = JSON.parse(line);
                
                if (this.isValidResponse(data)) {
                    this.callbacks.onToken(data.response);
                }
                
                if (data.done) {
                    this.callbacks.onComplete();
                    break;
                }
            } catch (e) {
                console.error('Error parsing stream line:', e);
                this.callbacks.onError?.(e instanceof Error ? e : new Error('Parse error'));
            }
        }
    }

    /**
     * Validate and clean response data
     * @param data StreamResponse object to validate
     * @returns boolean indicating if response is valid
     */
    private isValidResponse(data: StreamResponse): boolean {
        if (!data.response) return false;
        
        // Filter out think tags and empty responses
        const cleanResponse = data.response
            .replace(/<think>.*<\/think>/g, '')
            .trim();

        return cleanResponse.length > 0;
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        // Cleanup if needed
    }
}

// Usage example:
export const createStreamParser = (callbacks: StreamParserCallbacks): StreamParser => {
    return new StreamParser(callbacks);
};
