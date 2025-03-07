import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../types/ChatMessage';
import { Sidebar } from '../SideBar/Sidebar';
import { ChatMessage as ChatMessageComponent } from './Chat-components/ChatMessage';
import { ChatInput } from './Chat-components/ChatInput';
import { StreamingMessage } from '../../features/Streaming/StreamingMessage';
import { OllamaAPI } from '../../../utils/API/api';
import { ServiceError } from '../../features/Services/ServiceError';
import { loadConfig, updateLastUsedModel } from '../../../utils/config';
import { db } from '../../LocDB/ChatDatabase';

const Chat: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [model, setModel] = useState<string>('');
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [streamingContent, setStreamingContent] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [serviceError, setServiceError] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeChatId, setActiveChatId] = useState<number | undefined>(undefined);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [renderKey, setRenderKey] = useState<number>(0);
    const [chatListRefresh, setChatListRefresh] = useState<number>(0); // Add refresh counter

    const handleModelChange = (newModel: string) => {
        setModel(newModel);
        updateLastUsedModel(newModel);
        // Update model in active chat if there is one
        if (activeChatId) {
            updateChatModel(activeChatId, newModel);
        }
    };

    // Function to update chat model in the database
    const updateChatModel = async (chatId: number, modelName: string) => {
        try {
            const chat = await db.getChat(chatId);
            if (chat) {
                await db.chats.update(chatId, { model: modelName });
            }
        } catch (error) {
            console.error('Failed to update chat model:', error);
        }
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
            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: streamingContent
            };
            
            setMessages(prev => [...prev, assistantMessage]);
            setStreamingContent('');
            
            // Save to database if we have an active chat
            if (activeChatId) {
                db.addMessage(activeChatId, 'assistant', streamingContent);
            }
        }
    };

    // Add debounced update for streaming content to reduce flickering
    const updateStreamingContent = useRef(
        debounce((content: string) => {
            setStreamingContent(content);
        }, 50)
    ).current;

    const handleNewChat = async () => {
        setMessages([]);
        setActiveChatId(undefined);
        // Trigger refresh after creating a new chat (even though its empty at this point)
        setChatListRefresh(prev => prev + 1);
    };

    // Load a chat from the database
    const handleLoadChat = async (chatId: number) => {
        try {
            const chat = await db.getChat(chatId);
            if (!chat) return;
            
            // Set the active model to the one used in the chat
            if (chat.model && availableModels.includes(chat.model)) {
                setModel(chat.model);
                updateLastUsedModel(chat.model);
            }
            
            // Load messages for this chat
            const chatMessages = await db.getMessages(chatId);
            
            // Convert to ChatMessage format for the UI
            const uiMessages: ChatMessage[] = chatMessages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            
            setMessages(uiMessages);
            setActiveChatId(chatId);
        } catch (error) {
            console.error('Failed to load chat:', error);
        }
    };

    // Create a new chat or use existing one before adding messages
    const ensureActiveChatExists = async (): Promise<number> => {
        if (activeChatId) return activeChatId;
        
        // Create a new chat in the database
        const newChatId = await db.createChat('New Conversation', model);
        setActiveChatId(newChatId);
        // Trigger refresh after creating a chat
        setChatListRefresh(prev => prev + 1);
        return newChatId;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !model) return;

        const chatId = await ensureActiveChatExists();
        
        const userMessage: ChatMessage = {
            role: 'user',
            content: input
        };

        // Add message to UI
        setMessages(prev => [...prev, userMessage]);
        
        // Save user message to database
        await db.addMessage(chatId, 'user', input);
        
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
                async () => {
                    setIsStreaming(false);
                    
                    // Add assistant's response to UI
                    const assistantMessage: ChatMessage = {
                        role: 'assistant',
                        content: accumulatedResponse
                    };
                    
                    setMessages(prev => [...prev, assistantMessage]);
                    
                    // Save assistant message to database
                    await db.addMessage(chatId, 'assistant', accumulatedResponse);
                    
                    // Trigger refresh after adding message to update the chat list
                    setChatListRefresh(prev => prev + 1);
                    
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
                const errorMessage: ChatMessage = {
                    role: 'assistant',
                    content: 'Sorry, an error occurred.'
                };
                
                setMessages(prev => [...prev, errorMessage]);
                
                // Save error message to database
                await db.addMessage(chatId, 'assistant', 'Sorry, an error occurred.');
                
                // Trigger refresh after adding message
                setChatListRefresh(prev => prev + 1);
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
                onNewChat={handleNewChat}
                onLoadChat={handleLoadChat}
                activeChatId={activeChatId}
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                refreshTrigger={chatListRefresh} // Pass the refresh trigger
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
                                {/* Invisible element to scroll to */}
                                <div ref={messagesEndRef} />
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
