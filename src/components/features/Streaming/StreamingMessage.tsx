import React from 'react';

interface StreamingMessageProps {
    content: string;
    isComplete: boolean;
}

export const StreamingMessage: React.FC<StreamingMessageProps> = ({ content, isComplete }) => {
    return (
        <div className="rounded-lg p-4 bg-brand-50/50 dark:bg-brand-900/20">
            <div className="flex gap-4">
                <div className="flex-1 overflow-hidden">
                    <div className="font-medium text-brand-600 dark:text-brand-light mb-1">
                        Assistant
                    </div>
                    <div className="text-gray-800 dark:text-gray-200 leading-relaxed">
                        {content}
                        {!isComplete && (
                            <span className="inline-block w-1.5 h-4 ml-1 bg-brand-400 dark:bg-brand-light animate-pulse" />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
