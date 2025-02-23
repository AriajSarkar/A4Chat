import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types/ChatMessage';
import { ollamaAPI } from '../../api'; // Update import to use instance
import { Sidebar } from '../layout/Sidebar';
import { ChatMessage as ChatMessageComponent } from './chat/ChatMessage';
import { ChatInput } from './chat/ChatInput';
import { ModelSelector } from './chat/ModelSelector';
import { StreamingMessage } from './chat/StreamingMessage';

const Chat: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [model, setModel] = useState('llama2');
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [streamingContent, setStreamingContent] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadModels = async () => {
            const models = await ollamaAPI.listModels();
            setAvailableModels(models);
            if (models.length > 0) {
                setModel(models[0]);
            }
        };
        loadModels();
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !model) return;

        const userMessage: ChatMessage = {
            role: 'user',
            content: input
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsStreaming(true);
        setStreamingContent('');

        let accumulatedResponse = '';

        try {
            await ollamaAPI.generateStream(
                input,
                model,
                (token: string) => {
                    accumulatedResponse += token;
                    setStreamingContent(accumulatedResponse);
                },
                () => {
                    setIsStreaming(false);
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: accumulatedResponse
                    }]);
                }
            );
        } catch (error) {
            console.error('Error:', error);
            setIsStreaming(false);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, an error occurred.'
            }]);
        }
    };

    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar
                model={model}
                availableModels={availableModels}
                onModelChange={setModel}
                onNewChat={() => setMessages([])}
            />
            <div className="flex-1 flex flex-col">
                <ModelSelector
                    model={model}
                    availableModels={availableModels}
                    onModelChange={setModel}
                />
                <div className="flex-1 overflow-y-auto p-4">
                    {messages.length === 0 && (
                        <div className="h-full flex items-center justify-center text-gray-400">
                            Start a conversation with the AI
                        </div>
                    )}
                    {messages.map((message, index) => (
                        <ChatMessageComponent key={index} message={message} />
                    ))}
                    {isStreaming && (
                        <StreamingMessage 
                            content={streamingContent} 
                            isComplete={false} 
                        />
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <ChatInput
                    input={input}
                    isLoading={isStreaming}
                    onInputChange={setInput}
                    onSubmit={handleSubmit}
                />
            </div>
        </div>
    );
};

export default Chat;
