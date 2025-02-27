import React, { memo } from 'react';
import { Bot } from 'lucide-react';
import { MarkdownResponse } from '../format/Markdown/MarkdownResponse';

interface StreamingMessageProps {
    content: string;
    isComplete: boolean;
}

// Memoize to prevent re-renders when parent components change
export const StreamingMessage = memo(({ content, isComplete }: StreamingMessageProps) => {
    return (
        <div className={`
            rounded-lg p-4 transition-opacity duration-200
            bg-brand-50/50 dark:bg-brand-900/20
            animate-once animate-duration-300
        `}>
            <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                            bg-primary-600 text-white">
                    <Bot size={18} />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="font-medium text-brand-600 dark:text-brand-light mb-1">
                        Assistant {!isComplete && (
                            <span className="inline-block w-1 h-4 ml-1 align-middle 
                                        bg-brand-400/70 dark:bg-brand-light/70 
                                        animate-pulse rounded-full" />
                        )}
                    </div>
                    <MarkdownResponse content={content} isStreaming={!isComplete} />
                </div>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Only re-render when content changes substantially (more than 20 chars)
    if (nextProps.content.length - prevProps.content.length < 20 && !nextProps.isComplete) {
        return true; // prevent re-render for small changes
    }
    return false;
});
