import React, { memo } from 'react';
import { ChatMessage as ChatMessageType } from '../../../types/ChatMessage';
import { User, Bot } from 'lucide-react';
import { MarkdownResponse } from '../../../features/format/Markdown/MarkdownResponse';

interface ChatMessageProps {
    message: ChatMessageType;
}

// Using proper memoization to prevent re-renders when message content doesn't change
export const ChatMessage = memo(({ message }: ChatMessageProps) => {
    // Use role-specific optimizations
    const isAssistant = message.role === 'assistant';
    const roleIcon = isAssistant ? <Bot size={18} /> : <User size={18} />;
    const roleName = isAssistant ? 'Assistant' : 'You';
    
    return (
        <div className={`
            rounded-xl p-4 transition-all duration-200 ease-in-out
            shadow-sm border mb-4
            ${isAssistant 
              ? 'bg-white dark:bg-gray-800/60 border-gray-100 dark:border-gray-700' 
              : 'bg-brand-50/80 dark:bg-brand-900/30 border-brand-100/50 dark:border-brand-800/30'}
            overflow-hidden w-full break-words
        `}>
            {/* Added mb-4 to ensure consistent spacing between messages */}
            
            <div className="flex gap-3 items-start">
                <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center shrink-0
                    ${isAssistant
                      ? 'bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-400'
                      : 'bg-brand-500 text-white dark:bg-brand-600 dark:text-white'}
                `}>
                    {roleIcon}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                    <div className={`
                        font-medium mb-1.5
                        ${isAssistant 
                          ? 'text-brand-600 dark:text-brand-400' 
                          : 'text-brand-700 dark:text-brand-300'}
                    `}>
                        {roleName}
                    </div>
                    {isAssistant ? (
                        <div className="overflow-hidden max-w-full">
                            <MarkdownResponse content={message.content} isStreaming={false} />
                        </div>
                    ) : (
                        <div className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap break-words">
                            {message.content}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison function - only re-render if content or role changes
    return prevProps.message.role === nextProps.message.role &&
           prevProps.message.content === nextProps.message.content;
});

// Export with a display name for better debugging
ChatMessage.displayName = 'ChatMessage';
