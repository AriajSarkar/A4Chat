import React from 'react';

interface ChatInputProps {
    input: string;
    isLoading: boolean;
    onInputChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    input,
    isLoading,
    onInputChange,
    onSubmit
}) => {
    return (
        <div className="border-t border-gray-200 bg-white p-4">
            <form onSubmit={onSubmit} className="max-w-3xl mx-auto">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => onInputChange(e.target.value)}
                        placeholder="Type your message..."
                        disabled={isLoading}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-16 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:bg-gray-300"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
};
