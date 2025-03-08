import { useState, useCallback } from 'react';
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

    const handleSubmit = useCallback(async (e: React.FormEvent, model: string) => {
        e.preventDefault();
        if (!input.trim() || !model) return;

        const chatId = await ensureActiveChatExists(model);
        
        await addUserMessage(input, chatId);
        
        setInput('');
        setIsStreaming(true);
        setStreamingContent('');

        let accumulatedResponse = '';
        let completionTimeout: NodeJS.Timeout | null = null;
        let isCompleted = false;

        try {
            completionTimeout = setTimeout(() => {
                if (!isCompleted) {
                    console.warn('Generation completion timeout triggered');
                    handleGenerationComplete();
                }
            }, 30000);

            const handleGenerationComplete = async () => {
                if (isCompleted) return;
                isCompleted = true;
                
                if (completionTimeout) {
                    clearTimeout(completionTimeout);
                    completionTimeout = null;
                }

                setIsStreaming(false);
                
                await addAssistantMessage(accumulatedResponse, chatId);
                
                setStreamingContent('');
                
                requestAnimationFrame(() => {
                    setRenderKey(prev => prev + 1);
                });
            };

            await OllamaAPI.generateStream(
                input,
                model,
                (token: string) => {
                    accumulatedResponse += token;
                    updateStreamingContent(accumulatedResponse);
                },
                handleGenerationComplete,
                (error) => {
                    console.error('Generation error:', error);
                    setIsStreaming(false);
                    
                    if (completionTimeout) {
                        clearTimeout(completionTimeout);
                        completionTimeout = null;
                    }
                }
            );
        } catch (error) {
            console.error('Error:', error);
            setIsStreaming(false);
            
            if (completionTimeout) {
                clearTimeout(completionTimeout);
                completionTimeout = null;
            }
            
            if (!accumulatedResponse) {
                void addAssistantMessage('Sorry, an error occurred.', chatId);
            }
        }
    }, [input, ensureActiveChatExists, addUserMessage, setIsStreaming, setStreamingContent, addAssistantMessage, updateStreamingContent, setRenderKey]);

    return {
        input,
        setInput,
        handleSubmit
    };
};
