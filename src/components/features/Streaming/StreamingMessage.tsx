import React, { memo } from 'react';
import { Bot } from 'lucide-react';
import { MarkdownResponse } from '../format/Markdown/MarkdownResponse';

interface StreamingMessageProps {
    content: string;
    isComplete: boolean;
}

export const StreamingMessage = memo(({ content, isComplete }: StreamingMessageProps) => {
    return (
        <div className={`
            rounded-xl p-4 transition-all duration-200
            bg-white dark:bg-gray-800/60 
            shadow-sm border border-gray-100 dark:border-gray-700
        `}>
            <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0
                           bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-400">
                    <Bot size={18} />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="font-medium text-brand-600 dark:text-brand-400 mb-1.5 flex items-center">
                        Assistant 
                        {!isComplete && (
                            <span className="inline-block w-1.5 h-1.5 ml-2 
                                        bg-brand-400 dark:bg-brand-light 
                                        animate-pulse rounded-full" />
                        )}
                    </div>
                    <MarkdownResponse content={content || ' '} isStreaming={!isComplete} />
                </div>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Only re-render on substantial changes to reduce jank
    if (nextProps.isComplete !== prevProps.isComplete) {
        return false; // Always re-render when completion state changes
    }
    
    if (!nextProps.isComplete && nextProps.content.length - prevProps.content.length < 15) {
        return true; // Skip re-renders for small incremental updates
    }
    
    return false; // Allow re-render for substantial changes
});
