import { ReadableStreamDefaultReader } from 'stream/web';
import { rafThrottle } from '@/utils/performance';
import { StreamResponse } from '../../../../types/StreamResponse';

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
    let lastProcessTime = 0;
    const MIN_PROCESS_INTERVAL = 50; // ms - reduced from 100ms for more responsive updates
    
    // Process tokens in batches for better performance
    const processTokenBuffer = () => {
        if (tokenBuffer.length > 0) {
            throttledOnToken(tokenBuffer);
            tokenBuffer = '';
            tokenCount = 0;
            lastProcessTime = Date.now();
        }
    };
    
    return {
        async processStream(reader: ReadableStreamDefaultReader<Uint8Array>) {
            try {
                const decoder = new TextDecoder();
                let isProcessing = true;
                let pendingData = '';
                
                while (isProcessing) {
                    const { done, value } = await reader.read();
                    
                    if (done) {
                        processTokenBuffer();
                        if (!completionSent) {
                            completionSent = true;
                            onComplete();
                        }
                        break;
                    }
                    
                    if (value) {
                        const chunk = decoder.decode(value, { stream: true });
                        pendingData += chunk;
                        
                        try {
                            // Process any complete JSON lines
                            const lines = pendingData.split('\n');
                            
                            // Keep the last potentially incomplete line
                            pendingData = lines.pop() || '';
                            
                            for (const line of lines) {
                                if (!line.trim()) continue;
                                
                                try {
                                    const response = JSON.parse(line) as StreamResponse;
                                    
                                    if (response.response) {
                                        tokenBuffer += response.response;
                                        tokenCount++;
                                        
                                        // Process more frequently with smaller batches
                                        const now = Date.now();
                                        if (tokenCount >= batchSize || now - lastProcessTime > MIN_PROCESS_INTERVAL) {
                                            processTokenBuffer();
                                        }
                                    }
                                    
                                    if (response.done === true) {
                                        processTokenBuffer();
                                        if (!completionSent) {
                                            completionSent = true;
                                            onComplete();
                                            isProcessing = false;
                                            return;
                                        }
                                    }
                                } catch (parseError) {
                                    // Continue processing even if one line fails to parse
                                    console.warn('Error parsing JSON from stream:', parseError);
                                }
                            }
                        } catch (error) {
                            console.error('Error processing chunk:', error);
                        }
                    }
                }
            } catch (error) {
                processTokenBuffer();
                
                if (error.name !== 'AbortError') {
                    onError?.(error);
                }
            }
        }
    };
}
