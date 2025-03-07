import { ReadableStreamDefaultReader } from 'stream/web';
import { rafThrottle } from '../../../../utils/performance';

// Define the StreamResponse type locally instead of importing it
interface StreamResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
    context?: number[];
}

interface StreamParserOptions {
    onToken: (token: string) => void;
    onComplete: () => void;
    onError?: (error: Error) => void;
    batchSize?: number;
}

export function createStreamParser(options: StreamParserOptions) {
    const { onToken, onComplete, onError, batchSize = 5 } = options;
    
    // Use RAF throttling for token updates to ensure UI responsiveness
    const throttledOnToken = rafThrottle(onToken);
    
    // Buffer for accumulating tokens before processing
    let tokenBuffer = '';
    let tokenCount = 0;
    let completionSent = false;
    
    // Process tokens in batches for better performance
    const processTokenBuffer = () => {
        if (tokenBuffer.length > 0) {
            throttledOnToken(tokenBuffer);
            tokenBuffer = '';
            tokenCount = 0;
        }
    };
    
    return {
        async processStream(reader: ReadableStreamDefaultReader<Uint8Array>) {
            try {
                const decoder = new TextDecoder();
                let isProcessing = true;
                
                while (isProcessing) {
                    const { done, value } = await reader.read();
                    
                    if (done) {
                        // Process any remaining buffered tokens
                        processTokenBuffer();
                        if (!completionSent) {
                            completionSent = true;
                            onComplete();
                        }
                        break;
                    }
                    
                    // Decode and process the chunk
                    if (value) {
                        const chunk = decoder.decode(value, { stream: true });
                        
                        try {
                            // Process each line as a JSON object
                            const lines = chunk.split('\n');
                            
                            for (const line of lines) {
                                if (!line.trim()) continue;
                                
                                try {
                                    const response = JSON.parse(line) as StreamResponse;
                                    
                                    if (response.response) {
                                        tokenBuffer += response.response;
                                        tokenCount++;
                                        
                                        // Process in batches for better performance
                                        if (tokenCount >= batchSize) {
                                            processTokenBuffer();
                                        }
                                    }
                                    
                                    if (response.done === true) {
                                        // Process any remaining buffered tokens and signal completion
                                        processTokenBuffer();
                                        if (!completionSent) {
                                            completionSent = true;
                                            onComplete();
                                            isProcessing = false;
                                            return; // Exit immediately to prevent double completion
                                        }
                                    }
                                } catch (parseError) {
                                    console.warn('Error parsing JSON from stream:', parseError);
                                }
                            }
                        } catch (error) {
                            console.error('Error processing chunk:', error);
                        }
                    }
                }
            } catch (error) {
                // Process any remaining tokens before reporting error
                processTokenBuffer();
                
                if (error.name !== 'AbortError') {
                    onError?.(error);
                }
            }
        }
    };
}
