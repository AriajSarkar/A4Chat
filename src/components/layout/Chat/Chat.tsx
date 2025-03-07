import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../types/ChatMessage';
import { Sidebar } from '../SideBar/Sidebar';
import { ChatMessage as ChatMessageComponent } from './Chat-components/ChatMessage';
import { ChatInput } from './Chat-components/ChatInput';
import { StreamingMessage } from '../../features/Streaming/StreamingMessage';
import { OllamaAPI } from '../../../utils/API/api';
import { ServiceError } from '../../features/Services/ServiceError';
import { loadConfig, updateLastUsedModel } from '../../../utils/config';

const Chat: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [model, setModel] = useState<string>('');
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [streamingContent, setStreamingContent] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [serviceError, setServiceError] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [renderKey, setRenderKey] = useState<number>(0); // Add render key for controlled re-renders

    const handleModelChange = (newModel: string) => {
        setModel(newModel);
        updateLastUsedModel(newModel);
    };

    const loadModels = async () => {
        try {
            const models = await OllamaAPI.getModels();
            setAvailableModels(models);
            
            // Load last used model from config or use first available
            const config = loadConfig();
            const lastUsed = config.lastUsedModel;
            
            if (lastUsed && models.includes(lastUsed)) {
                setModel(lastUsed);
            } else if (models.length > 0) {
                setModel(models[0]);
                updateLastUsedModel(models[0]);
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

    const handleStopGeneration = () => {
        OllamaAPI.stopGeneration();
        setIsStreaming(false);
        // Keep the accumulated content by adding it as a complete message
        if (streamingContent) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: streamingContent
            }]);
            setStreamingContent('');
        }
    };

    // Add debounced update for streaming content to reduce flickering
    const updateStreamingContent = useRef(
        debounce((content: string) => {
            setStreamingContent(content);
        }, 50)
    ).current;

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
                    // Use debounced update to reduce flickering
                    updateStreamingContent(accumulatedResponse);
                },
                () => {
                    setIsStreaming(false);
                    setMessages(prev => [
                        ...prev, 
                        {
                            role: 'assistant',
                            content: accumulatedResponse
                        }
                    ]);
                    setStreamingContent('');
                    // Increment render key to force clean re-render after completion
                    setRenderKey(prev => prev + 1);
                },
                (error) => {
                    console.error('Generation error:', error);
                    setIsStreaming(false);
                }
            );
        } catch (error) {
            console.error('Error:', error);
            setIsStreaming(false);
            // Only add error message if we haven't accumulated any response
            if (!accumulatedResponse) {
                setMessages(prev => [
                    ...prev, 
                    {
                        role: 'assistant',
                        content: 'Sorry, an error occurred.'
                    }
                ]);
            }
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
                onModelChange={handleModelChange}
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
                            <div className="space-y-6" key={renderKey}>
                                {messages.map((message, index) => (
                                    <div key={`msg-${index}`} className="animate-once animate-fade-up animate-duration-300">
                                        <ChatMessageComponent message={message} />
                                    </div>
                                ))}
                                {isStreaming && (
                                    <div className="animate-once animate-fade-up animate-duration-300">
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
                <footer className="sticky bottom-0 z-10 rounded-tr-3xl bg-white/80 dark:bg-gray-800/80 
                                backdrop-blur-md border-t border-gray-200 dark:border-gray-700">
                    <div className="max-w-4xl mx-auto w-full pb-4">
                        <ChatInput
                            input={input}
                            isLoading={isStreaming}
                            onInputChange={setInput}
                            onSubmit={handleSubmit}
                            onStop={handleStopGeneration}
                            model={model}
                            availableModels={availableModels}
                            onModelChange={handleModelChange}
                        />
                    </div>
                </footer>
            </main>
        </div>
    );
};

// Add a simple debounce function
function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    
    return function(...args: Parameters<T>): void {
        if (timeout) {
            clearTimeout(timeout);
        }
        
        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    };
}

export default Chat;
