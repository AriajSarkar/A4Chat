import { useState, useRef, useCallback, useMemo } from 'react';
import { OllamaAPI } from '@/utils/API/api';
import { ChatMessage } from '@/components/types/ChatMessage';
import { debounce } from '@/utils/debounce';

export const useStreamingManager = (
    addAssistantMessage: (content: string, chatId: number) => Promise<void>
) => {
    const [streamingContent, setStreamingContent] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [renderKey, setRenderKey] = useState<number>(0);
    const lastUpdateTimestamp = useRef(0);
    const isTransitioningRef = useRef(false);
    
    // More responsive debounce for UI updates
    const updateStreamingContent = useMemo(() => 
        debounce((content: string) => {
            // Skip updates during transition to prevent bouncing
            if (isTransitioningRef.current) return;
            
            setStreamingContent(content);
            lastUpdateTimestamp.current = Date.now();
        }, 20), // 20ms debounce (reduced from 30ms) for more responsive updates
        []
    );

    const cancelUpdateStreamingRef = useRef(updateStreamingContent.cancel);

    // More responsive UI update checks
    const ensureUIUpdates = useCallback(() => {
        let intervalId: NodeJS.Timeout;
        
        if (isStreaming) {
            // Check more frequently to ensure UI is updated
            intervalId = setInterval(() => {
                const now = Date.now();
                // Force update if no updates for a shorter period (1.5s)
                if (now - lastUpdateTimestamp.current > 1500) {
                    setRenderKey(prev => prev + 1);
                }
            }, 750); // Check more frequently (750ms instead of 1000ms)
        }
        
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isStreaming]);

    // Start the UI update checker when streaming begins
    useMemo(() => {
        const cleanup = ensureUIUpdates();
        return () => cleanup();
    }, [isStreaming, ensureUIUpdates]);

    const handleStopGeneration = useCallback((activeChatId?: number, setMessages?: React.Dispatch<React.SetStateAction<ChatMessage[]>>) => {
        if (isTransitioningRef.current) return; // Prevent multiple calls
        isTransitioningRef.current = true;
        
        // Stop the generation first
        OllamaAPI.stopGeneration();
        
        // Store content locally since we're going to reset it
        const finalContent = streamingContent;
        
        // First turn off streaming mode to prevent UI duplication
        setIsStreaming(false);
        
        // Force a render update
        setRenderKey(prev => prev + 1);
        
        // Then add the message after a delay to ensure clean UI transition
        if (finalContent.trim() && activeChatId && setMessages) {
            setTimeout(async () => {
                try {
                    // Add the message to the database with the proper chatId parameter
                    await addAssistantMessage(finalContent, activeChatId);
                    
                    // After database update is complete, update UI state
                    const assistantMessage: ChatMessage = {
                        role: 'assistant',
                        content: finalContent
                    };
                    
                    // Add to UI state after streaming UI is gone
                    setMessages(prev => [...prev, assistantMessage]);
                    
                    // Reset streaming content and transition flag after everything is done
                    setStreamingContent('');
                    
                    // Final UI refresh
                    setRenderKey(prev => prev + 1);
                } catch (error) {
                    console.error('Error saving assistant message:', error);
                } finally {
                    isTransitioningRef.current = false;
                }
            }, 50);
        } else {
            // If no content to add, just reset state
            setStreamingContent('');
            isTransitioningRef.current = false;
        }
    }, [streamingContent, addAssistantMessage, setIsStreaming, setStreamingContent, setRenderKey]);

    return {
        streamingContent,
        isStreaming,
        renderKey,
        updateStreamingContent,
        cancelUpdateStreamingRef,
        handleStopGeneration,
        setIsStreaming,
        setStreamingContent,
        setRenderKey
    };
};
