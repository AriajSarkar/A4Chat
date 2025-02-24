import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../types/ChatMessage';
import { Sidebar } from '../../layout/SideBar/Sidebar';
import { ChatMessage as ChatMessageComponent } from './Chat-components/ChatMessage';
import { ChatInput } from './Chat-components/ChatInput';
import { StreamingMessage } from '../Streaming/StreamingMessage';
import { OllamaAPI } from '../../../utils/API/api';
import { ServiceError } from '../Services/ServiceError';

const Chat: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [model, setModel] = useState('llama2');
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [streamingContent, setStreamingContent] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [serviceError, setServiceError] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const loadModels = async () => {
        try {
            const models = await OllamaAPI.getModels();
            setAvailableModels(models);
            if (models.length > 0) {
                setModel(models[0]);
            }
            setServiceError(false);
        } catch (error) {
            if (error instanceof Error && error.message === 'OLLAMA_SERVICE_OFFLINE') {
                setServiceError(true);
            }
            console.error('Failed to load models:', error);
        }
    };

    useEffect(() => {
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
            await OllamaAPI.generateStream(
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

    const handleRetry = () => {
        setServiceError(false);
        loadModels();
    };

    if (serviceError) {
        return <ServiceError onRetry={handleRetry} />;
    }

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
            <Sidebar
                model={model}
                availableModels={availableModels}
                onModelChange={setModel}
                onNewChat={() => setMessages([])}
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            />
            <main className={`
                flex-1 flex flex-col min-w-0
                transition-all duration-300 ease-in-out
                ${!isSidebarOpen ? 'pl-16' : 'pl-64'}
            `}>
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
                        {messages.length === 0 ? (
                            <div className="h-[calc(100vh-12rem)] flex items-center justify-center text-gray-500">
                                <span className="animate-fade-up">
                                    Start a conversation with the AI
                                </span>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {messages.map((message, index) => (
                                    <div key={index} className="animate-fade-up">
                                        <ChatMessageComponent message={message} />
                                    </div>
                                ))}
                                {isStreaming && (
                                    <div className="animate-fade-up">
                                        <StreamingMessage 
                                            content={streamingContent} 
                                            isComplete={false}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <footer className="sticky bottom-0 z-[100] bg-white/80 dark:bg-gray-800/80 
                                backdrop-blur-md border-t border-gray-200 dark:border-gray-700">
                    <div className="max-w-4xl mx-auto w-full p-4">
                        <ChatInput
                            input={input}
                            isLoading={isStreaming}
                            onInputChange={setInput}
                            onSubmit={handleSubmit}
                        />
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default Chat;
