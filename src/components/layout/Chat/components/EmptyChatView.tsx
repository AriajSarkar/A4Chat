import React from 'react';

const EmptyChatView: React.FC = () => {
    return (
        <div className="h-[calc(100vh-12rem)] flex flex-col items-center justify-center text-gray-500">
            <div className="bg-white/50 dark:bg-gray-800/50 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mb-4">
                <h1 className="text-xl font-medium text-center text-brand-600 dark:text-brand-400 mb-2">Welcome to Ariaj Chat</h1>
                <p className="text-center text-gray-600 dark:text-gray-400">
                    Start a conversation with the AI assistant using the input box below.
                </p>
            </div>
        </div>
    );
};

export default EmptyChatView;
