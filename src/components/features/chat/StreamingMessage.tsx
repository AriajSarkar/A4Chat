import React, { useEffect, useRef } from 'react';

interface StreamingMessageProps {
    content: string;
    isComplete: boolean;
}

export const StreamingMessage: React.FC<StreamingMessageProps> = ({ content, isComplete }) => {
    const messageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messageRef.current) {
            messageRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [content]);

    return (
        <div 
            ref={messageRef}
            className={`p-4 rounded-lg my-2 bg-white shadow-sm ${
                isComplete ? 'border-green-500' : 'border-yellow-500'
            } border-l-4`}
        >
            {content}
            {!isComplete && (
                <span className="inline-block animate-pulse ml-1">▊</span>
            )}
        </div>
    );
};
