import React, { RefObject, memo } from 'react';
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
    return (
        <div className="space-y-4" key={renderKey}>
            <div className="flex flex-col space-y-4">
                {messages.map((message, index) => (
                    <div key={index} className="animate-once animate-fade-up animate-duration-300">
                        <MemoizedChatMessage message={message} />
                    </div>
                ))}
            </div>
            
            {isStreaming && (
                <div className="mb-4 animate-once animate-fade-up animate-duration-300">
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
