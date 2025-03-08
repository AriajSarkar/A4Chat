import React, { RefObject, memo, useRef, useEffect, useState } from 'react';
import { ChatMessage as ChatMessageType } from '../../../types/ChatMessage';
import { ChatMessage } from './ChatMessage';
import { StreamingMessage } from '../../../features/Streaming/StreamingMessage';

interface ChatMessagesProps {
    messages: ChatMessageType[];
    isStreaming: boolean;
    streamingContent: string;
    renderKey: number;
    messagesEndRef: RefObject<HTMLDivElement>;
}

const MemoizedChatMessage = memo(ChatMessage);
const MemoizedStreamingMessage = memo(StreamingMessage);

const ChatMessages: React.FC<ChatMessagesProps> = ({ 
    messages, 
    isStreaming, 
    streamingContent, 
    renderKey,
    messagesEndRef 
}) => {
    // Use a ref to store the height of the message container
    const containerRef = useRef<HTMLDivElement>(null);
    const prevHeightRef = useRef<number>(0);
    const heightTransitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastStreamingContentRef = useRef<string>('');
    const [internalRenderKey, setInternalRenderKey] = useState(0);
    
    // Better height stabilization for smoother transitions
    useEffect(() => {
        if (containerRef.current) {
            if (isStreaming) {
                // Remember current height during streaming
                prevHeightRef.current = containerRef.current.offsetHeight;
                lastStreamingContentRef.current = streamingContent;
                
                // Clear any existing timeout to avoid race conditions
                if (heightTransitionTimeoutRef.current) {
                    clearTimeout(heightTransitionTimeoutRef.current);
                    heightTransitionTimeoutRef.current = null;
                }
            } else if (prevHeightRef.current > 0) {
                // Only apply min-height if we have a previous height and are transitioning from streaming
                containerRef.current.style.minHeight = `${prevHeightRef.current}px`;
                
                // Force refresh when streaming stops to ensure clean UI
                setInternalRenderKey(prev => prev + 1);
                
                // Use a longer timeout and keep track of it to prevent overlapping transitions
                heightTransitionTimeoutRef.current = setTimeout(() => {
                    if (containerRef.current) {
                        // Smooth transition back to auto height
                        containerRef.current.style.transition = 'min-height 300ms ease-out';
                        containerRef.current.style.minHeight = '';
                        
                        // Remove the transition property after it's complete
                        setTimeout(() => {
                            if (containerRef.current) {
                                containerRef.current.style.transition = '';
                            }
                            // One final refresh after transition completes
                            setInternalRenderKey(prev => prev + 1);
                        }, 350);
                    }
                    heightTransitionTimeoutRef.current = null;
                }, 500); // Longer delay before removing the minHeight
            }
        }
        
        // Cleanup timeouts on unmount
        return () => {
            if (heightTransitionTimeoutRef.current) {
                clearTimeout(heightTransitionTimeoutRef.current);
            }
        };
    }, [isStreaming, streamingContent]);
    
    // Watch for changes in messages to detect completion
    useEffect(() => {
        if (!isStreaming && messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            // If the last streaming content was added to messages, trigger cleanup
            if (lastMessage.role === 'assistant' && lastMessage.content === lastStreamingContentRef.current) {
                // Force refresh to ensure clean UI
                setInternalRenderKey(prev => prev + 1);
                // Clear the last streaming content
                lastStreamingContentRef.current = '';
            }
        }
    }, [messages, isStreaming]);
    
    // Enhanced logic to prevent duplication
    const shouldShowStreaming = isStreaming && streamingContent && (
        // Don't show streaming message if the last message is already from the assistant and has the same content
        messages.length === 0 || 
        messages[messages.length - 1].role !== 'assistant' ||
        messages[messages.length - 1].content !== streamingContent
    );
    
    // Combine external and internal render keys for complete refresh
    const combinedRenderKey = `${renderKey}-${internalRenderKey}`;
    
    return (
        <div className="space-y-4" key={combinedRenderKey} ref={containerRef}>
            <div className="flex flex-col space-y-4">
                {messages.map((message, index) => (
                    <div key={index} className="message-item">
                        <MemoizedChatMessage message={message} />
                    </div>
                ))}
            </div>
            
            {shouldShowStreaming && (
                <div className="streaming-message" key={`streaming-${internalRenderKey}`}>
                    <MemoizedStreamingMessage 
                        content={streamingContent} 
                        isComplete={false} 
                    />
                </div>
            )}
            
            <div ref={messagesEndRef} className="h-1"></div>
        </div>
    );
};

export default memo(ChatMessages);
