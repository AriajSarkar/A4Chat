import React from 'react';
import { ChatMessage as ChatMessageType } from '../../../types/ChatMessage';
import { User, Bot } from 'lucide-react';
import { MarkdownResponse } from '../../../features/format/Markdown/MarkdownResponse';

interface ChatMessageProps {
    message: ChatMessageType;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
    return (
        <div className={`
            rounded-lg p-4 transition-all duration-200 ease-in-out
            overflow-hidden w-full break-words
            ${message.role === 'assistant' 
                ? 'bg-brand-50/50 dark:bg-brand-900/20' 
                : 'bg-white dark:bg-gray-800/50'
            }
        `}>
            <div className="flex gap-4 items-start">
                <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                    ${message.role === 'assistant'
                        ? 'bg-primary-600 text-white'
                        : 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400'
                    }
                `}>
                    {message.role === 'assistant' ? (
                        <Bot size={18} />
                    ) : (
                        <User size={18} />
                    )}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="font-medium text-brand-600 dark:text-brand-light mb-1">
                        {message.role === 'assistant' ? 'Assistant' : 'You'}
                    </div>
                    {message.role === 'assistant' ? (
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
};
