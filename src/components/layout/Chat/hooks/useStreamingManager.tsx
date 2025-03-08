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
    
    const updateStreamingContent = useMemo(() => 
        debounce((content: string) => {
            requestAnimationFrame(() => {
                setStreamingContent(content);
            });
        }, 30),
        []
    );

    const cancelUpdateStreamingRef = useRef(updateStreamingContent.cancel);

    const handleStopGeneration = useCallback((activeChatId?: number, setMessages?: React.Dispatch<React.SetStateAction<ChatMessage[]>>) => {
        OllamaAPI.stopGeneration();
        
        if (streamingContent.trim() && activeChatId && setMessages) {
            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: streamingContent
            };
            
            setMessages(prev => [...prev, assistantMessage]);
            void addAssistantMessage(streamingContent, activeChatId);
        }
        
        setIsStreaming(false);
        setStreamingContent('');
    }, [streamingContent, addAssistantMessage]);

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
