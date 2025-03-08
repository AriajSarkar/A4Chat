import { useState, useCallback, useRef } from 'react';
import { OllamaAPI } from '@/utils/API/api';

export const useChatHandlers = (
    ensureActiveChatExists: (model: string) => Promise<number>,
    addUserMessage: (content: string, chatId: number) => Promise<void>,
    addAssistantMessage: (content: string, chatId: number) => Promise<void>,
    updateStreamingContent: (content: string) => void,
    setIsStreaming: (value: boolean) => void,
    setStreamingContent: (content: string) => void,
    setRenderKey: (updater: (prev: number) => number) => void
) => {
    const [input, setInput] = useState('');
    // Add flag to track if we've completed processing
    const messageCompletedRef = useRef<boolean>(false);

    const handleSubmit = useCallback(async (e: React.FormEvent, model: string) => {
        e.preventDefault();
        if (!input.trim() || !model) return;

        const chatId = await ensureActiveChatExists(model);
        
        await addUserMessage(input, chatId);
        
        setInput('');
        setIsStreaming(true);
        setStreamingContent('');
        // Force a render key update to ensure clean UI state
        setRenderKey(prev => prev + 1);

        let accumulatedResponse = '';
        // Reset completion flag for new submission
        messageCompletedRef.current = false;

        try {
            const handleGenerationComplete = async () => {
                // Only process once using the flag reference
                if (messageCompletedRef.current) return;
                messageCompletedRef.current = true;

                // First hide streaming UI
                setIsStreaming(false);
                
                // Force a render key update to clean the UI
                setRenderKey(prev => prev + 1);
                
                // Wait for UI to update before adding the completed message
                setTimeout(async () => {
                    // Now add the completed message after the streaming UI is gone
                    await addAssistantMessage(accumulatedResponse, chatId);
                    setStreamingContent('');
                    // Final render key update after everything is done
                    setRenderKey(prev => prev + 1);
                }, 50);
            };

            await OllamaAPI.generateStream(
                input,
                model,
                (token: string) => {
                    if (messageCompletedRef.current) return; // Skip if already completed
                    accumulatedResponse += token;
                    updateStreamingContent(accumulatedResponse);
                },
                handleGenerationComplete,
                (error) => {
                    console.error('Generation error:', error);
                    messageCompletedRef.current = true;
                    setIsStreaming(false);
                    
                    if (!accumulatedResponse) {
                        setTimeout(() => {
                            void addAssistantMessage('Sorry, an error occurred.', chatId);
                        }, 50);
                    } else {
                        // Still save what we got before the error
                        setTimeout(() => {
                            void addAssistantMessage(accumulatedResponse, chatId);
                        }, 50);
                    }
                }
            );
        } catch (error) {
            console.error('Error:', error);
            messageCompletedRef.current = true;
            setIsStreaming(false);
            
            if (!accumulatedResponse) {
                setTimeout(() => {
                    void addAssistantMessage('Sorry, an error occurred.', chatId);
                }, 50);
            }
        }
    }, [input, ensureActiveChatExists, addUserMessage, setIsStreaming, setStreamingContent, addAssistantMessage, updateStreamingContent, setRenderKey]);

    return {
        input,
        setInput,
        handleSubmit
    };
};
