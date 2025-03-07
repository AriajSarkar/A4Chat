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
                    className="flex flex-col dark:bg-transparent dark:text-white px-2 py-1 max-w-3xl mx-auto"
                >
                    <div className="flex items-end border border-gray-200 dark:border-gray-700 rounded-2xl p-1.5 pr-2.5 
                                  bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-sm">
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
                                    transition-all duration-200 ease-out placeholder:text-gray-400"
                            rows={1}
                            onInput={adjustHeight}
                        />
                        
                        {isLoading ? (
                            <button
                                type="button"
                                title='Stop'
                                onClick={onStop}
                                className="p-2.5 bg-red-500 hover:bg-red-600 dark:hover:bg-red-700 text-white rounded-xl 
                                         transition-all duration-200 ease-in-out shadow-sm"
                            >
                                <Ban size={18} />
                            </button>
                        ) : (
                            <Tooltip content="Send" position="top">
                                <button
                                    type="submit"
                                    aria-label="Send message"
                                    disabled={!input.trim()}
                                    className="p-2.5 bg-brand-500 hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-500 
                                             text-white rounded-xl transition-all duration-200 ease-in-out 
                                             disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                >
                                    <SendHorizontal size={18} />
                                </button>
                            </Tooltip>
                        )}
                    </div>

                    {/* Model selector aligned with textarea */}
                    <div className="mt-2 flex justify-end animate-once animate-fade-in animate-duration-300">
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
