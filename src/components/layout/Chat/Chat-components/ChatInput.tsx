import React from 'react';
import { Square } from 'lucide-react';

interface ChatInputProps {
    input: string;
    isLoading: boolean;
    onInputChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    onStop: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    input,
    isLoading,
    onInputChange,
    onSubmit,
    onStop
}) => {
    return (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <form onSubmit={onSubmit} className="max-w-3xl mx-auto">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => onInputChange(e.target.value)}
                        placeholder="Type your message..."
                        disabled={isLoading}
                        className="w-full rounded-lg px-4 py-3 pr-24
                                 bg-white dark:bg-gray-800 
                                 border border-gray-200 dark:border-gray-700
                                 text-gray-800 dark:text-gray-100
                                 placeholder-gray-500 dark:placeholder-gray-400
                                 focus:outline-none focus:ring-2 focus:ring-brand-500
                                 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                    />
                    {isLoading ? (
                        <button
                            type="button"
                            onClick={onStop}
                            className="absolute right-2 top-1/2 -translate-y-1/2
                                     rounded-lg px-4 py-2
                                     bg-red-500 hover:bg-red-600
                                     text-white font-medium
                                     transition-colors duration-200
                                     flex items-center gap-2"
                        >
                            <Square className="w-4 h-4" />
                            Stop
                        </button>
                    ) : (
                        <button
                            type="submit"
                            className="absolute right-2 top-1/2 -translate-y-1/2
                                     rounded-lg px-4 py-2
                                     bg-brand-500 hover:bg-brand-600
                                     text-white font-medium
                                     transition-colors duration-200"
                        >
                            Send
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};
