import React, { useRef } from 'react';
import { SendHorizontal, Ban } from 'lucide-react';
import { Tooltip } from '../../../../styles/Tooltip';
import { ModelSelector } from '../../../features/Services/ModelSelector';

interface ChatInputProps {
    input: string;
    isLoading: boolean;
    onInputChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    onStop: () => void;
    model: string;
    availableModels: string[];
    onModelChange: (model: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    input,
    isLoading,
    onInputChange,
    onSubmit,
    onStop,
    model,
    availableModels,
    onModelChange
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.trim() && !isLoading) {
                onSubmit(e as any);
                resetTextarea();
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSubmit(e);
            resetTextarea();
        }
    };

    const adjustHeight = (e: React.FormEvent<HTMLTextAreaElement>) => {
        const target = e.target as HTMLTextAreaElement;
        target.style.height = 'auto';
        target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
    };

    const resetTextarea = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = '40px';
        }
    };

    return (
        <div className="relative">
            <form onSubmit={handleSubmit} className="relative">
                <div
                    className="flex flex-col dark:bg-transparent dark:text-white px-3 py-2 max-w-3xl mx-auto
                              opacity-0 translate-y-2 animate-[fadeIn_0.3s_ease-out_forwards]"
                >
                    <div className="flex items-end">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => onInputChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your message..."
                            aria-label='Chat message'
                            disabled={isLoading}
                            className="bg-transparent dark:text-white rounded p-2 w-full 
                                    resize-none overflow-y-auto outline-none min-h-[40px]
                                    transition-all duration-200 ease-out"
                            rows={1}
                            onInput={adjustHeight}
                        />
                        
                        {isLoading ? (
                            <button
                                type="button"
                                title='Stop'
                                onClick={onStop}
                                className="hover:text-white p-2 ml-2 bg-red-500 hover:bg-red-600 dark:hover:bg-red-700 text-white rounded-3xl transition-all duration-300 ease-in-out flex items-center gap-2"
                            >
                                <Ban />
                            </button>
                        ) : (
                            <Tooltip content="Send" position="top">
                                <button
                                    type="submit"
                                    aria-label="Send message"
                                    className="hover:text-white p-2 ml-2 hover:bg-black dark:bg-black/50 dark:hover:bg-white dark:hover:text-black rounded-tr-3xl transition-all duration-300 ease-in-out"
                                >
                                    <SendHorizontal className="w-6 h-6" />
                                </button>
                            </Tooltip>
                        )}
                    </div>

                    {/* Model selector aligned with textarea */}
                    <div className="mt-1 ml-2">
                        <ModelSelector
                            model={model}
                            availableModels={availableModels}
                            onModelChange={onModelChange}
                            compact={true}
                        />
                    </div>
                </div>
            </form>
        </div>
    );
};
