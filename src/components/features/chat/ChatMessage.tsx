import React from 'react';
import { ChatMessage as ChatMessageType } from '../../types/ChatMessage';

interface ChatMessageProps {
    message: ChatMessageType;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
    return (
        <div className={`border-b border-gray-200 ${message.role === 'assistant' ? 'bg-white' : 'bg-gray-50'}`}>
            <div className="max-w-3xl mx-auto px-4 py-6">
                <div className="flex space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'assistant' ? 'bg-green-500' : 'bg-blue-500'
                    }`}>
                        {message.role === 'assistant' ? 'AI' : 'U'}
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="font-medium">
                            {message.role === 'assistant' ? 'Assistant' : 'You'}
                        </div>
                        <div className="prose prose-sm">
                            {message.content}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
