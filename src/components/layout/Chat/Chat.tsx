import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChatMessage } from '../../types/ChatMessage';
import { Sidebar } from '../SideBar/Sidebar';
import { ChatMessage as ChatMessageComponent } from './Chat-components/ChatMessage';
import { ChatInput } from './Chat-components/ChatInput';
import { StreamingMessage } from '../../features/Streaming/StreamingMessage';
import { OllamaAPI } from '../../../utils/API/api';
import { ServiceError } from '../../features/Services/ServiceError';
import { loadConfig, updateLastUsedModel } from '../../../utils/config';
import { db } from '../../LocDB/ChatDatabase';
import { throttle as throttleUtil, registerCleanup } from '../../../utils/performance';

// Create a memoized chat message component for better performance
const MemoizedChatMessage = React.memo(ChatMessageComponent);
const MemoizedStreamingMessage = React.memo(StreamingMessage);

const Chat: React.FC = () => {
    // State declarations - unchanged
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
    const [chatListRefresh, setChatListRefresh] = useState<number>(0);
    
    // Throttled scroll to prevent performance issues when many messages are added quickly
    const throttledScrollToBottom = useCallback(throttleUtil(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100), [messagesEndRef]);
    
    // Memoize handlers for better performance
    const handleModelChange = useCallback((newModel: string) => {
        setModel(newModel);
        updateLastUsedModel(newModel);
        if (activeChatId) {
            updateChatModel(activeChatId, newModel);
        }
    }, [activeChatId]);

    const updateChatModel = useCallback(async (chatId: number, modelName: string) => {
        try {
            const chat = await db.getChat(chatId);
            if (chat) {
                await db.chats.update(chatId, { model: modelName });
            }
        } catch (error) {
            console.error('Failed to update chat model:', error);
        }
    }, []);

    const loadModels = useCallback(async () => {
        try {
            const models = await OllamaAPI.getModels();
            setAvailableModels(models);
            
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
    }, []);

    useEffect(() => {
        loadModels();
    }, [loadModels]);

    // Optimized useEffect for scrolling with throttling
    useEffect(() => {
        if (messages.length > 0) {
            throttledScrollToBottom();
        }
    }, [messages, throttledScrollToBottom]);

    // Use a more aggressive scroll approach during streaming
    useEffect(() => {
        if (isStreaming && streamingContent) {
            // Immediate scroll for streaming content
            requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
            });
        }
    }, [isStreaming, streamingContent]);

    const handleStopGeneration = useCallback(() => {
        OllamaAPI.stopGeneration();
        
        // When stopping manually, we need to add the current streaming content to chat history
        if (streamingContent.trim()) {
            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: streamingContent
            };
            
            setMessages(prev => [...prev, assistantMessage]);
            
            // Save to database if we have an active chat
            if (activeChatId) {
                void db.addMessage(activeChatId, 'assistant', streamingContent);
                void setChatListRefresh(prev => prev + 1);
            }
        }
        
        setIsStreaming(false);
        setStreamingContent('');
    }, [streamingContent, activeChatId]);

    // Optimized debounce for streaming content
    const updateStreamingContent = useMemo(() => 
        debounce((content: string) => {
            // Split into smaller tasks using requestAnimationFrame for smoother UI
            requestAnimationFrame(() => {
                setStreamingContent(content);
            });
        }, 30),
        []
    );

    // Store reference to cancel function for cleanup
    const cancelUpdateStreamingRef = useRef(updateStreamingContent.cancel);

    const handleNewChat = useCallback(async () => {
        setMessages([]);
        setActiveChatId(undefined);
        setChatListRefresh(prev => prev + 1);
    }, []);

    const handleLoadChat = useCallback(async (chatId: number) => {
        try {
            const chat = await db.getChat(chatId);
            if (!chat) return;
            
            if (chat.model && availableModels.includes(chat.model)) {
                setModel(chat.model);
                updateLastUsedModel(chat.model);
            }
            
            // Load messages in chunks for better performance with large chat histories
            const chatMessages = await db.getMessages(chatId);
            
            // Process messages in batches using a lightweight virtual window
            const uiMessages: ChatMessage[] = chatMessages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            
            setMessages(uiMessages);
            setActiveChatId(chatId);
        } catch (error) {
            console.error('Failed to load chat:', error);
        }
    }, [availableModels]);

    const ensureActiveChatExists = useCallback(async (): Promise<number> => {
        if (activeChatId) return activeChatId;
        
        const newChatId = await db.createChat('New Conversation', model);
        setActiveChatId(newChatId);
        setChatListRefresh(prev => prev + 1);
        return newChatId;
    }, [activeChatId, model]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !model) return;

        const chatId = await ensureActiveChatExists();
        
        const userMessage: ChatMessage = {
            role: 'user',
            content: input
        };

        setMessages(prev => [...prev, userMessage]);
        
        // Execute database operation asynchronously to avoid UI blocking
        void db.addMessage(chatId, 'user', input);
        
        setInput('');
        setIsStreaming(true);
        setStreamingContent('');

        let accumulatedResponse = '';
        let completionTimeout: NodeJS.Timeout | null = null;
        let isCompleted = false; // Track completion state to prevent duplication

        try {
            // Set up a backup timeout to ensure generation always completes
            completionTimeout = setTimeout(() => {
                if (isStreaming) {
                    console.warn('Generation completion timeout triggered');
                    handleGenerationComplete();
                }
            }, 30000); // 30-second timeout

            // Function to handle completion
            const handleGenerationComplete = async () => {
                // Prevent duplicate messages by checking if we've already completed
                if (isCompleted) return;
                isCompleted = true;
                
                if (completionTimeout) {
                    clearTimeout(completionTimeout);
                    completionTimeout = null;
                }

                setIsStreaming(false);
                
                const assistantMessage: ChatMessage = {
                    role: 'assistant',
                    content: accumulatedResponse
                };
                
                setMessages(prev => [...prev, assistantMessage]);
                
                // Run these operations asynchronously to prevent UI blocking
                Promise.all([
                    db.addMessage(chatId, 'assistant', accumulatedResponse),
                    new Promise(resolve => {
                        setChatListRefresh(prev => {
                            resolve(prev + 1);
                            return prev + 1;
                        });
                    })
                ]).catch(console.error);
                
                setStreamingContent('');
                
                // Use requestAnimationFrame to make sure UI updates are smooth
                requestAnimationFrame(() => {
                    setRenderKey(prev => prev + 1);
                });
            };

            await OllamaAPI.generateStream(
                input,
                model,
                (token: string) => {
                    accumulatedResponse += token;
                    updateStreamingContent(accumulatedResponse);
                },
                handleGenerationComplete,
                (error) => {
                    console.error('Generation error:', error);
                    setIsStreaming(false);
                    
                    if (completionTimeout) {
                        clearTimeout(completionTimeout);
                        completionTimeout = null;
                    }
                }
            );
        } catch (error) {
            console.error('Error:', error);
            setIsStreaming(false);
            
            if (completionTimeout) {
                clearTimeout(completionTimeout);
                completionTimeout = null;
            }
            
            if (!accumulatedResponse) {
                const errorMessage: ChatMessage = {
                    role: 'assistant',
                    content: 'Sorry, an error occurred.'
                };
                
                setMessages(prev => [...prev, errorMessage]);
                
                // Handle errors asynchronously
                void db.addMessage(chatId, 'assistant', 'Sorry, an error occurred.');
                void setChatListRefresh(prev => prev + 1);
            }
        }
    }, [input, model, ensureActiveChatExists, isStreaming]);

    const handleRetry = useCallback(() => {
        setServiceError(false);
        loadModels();
    }, [loadModels]);
    
    // Use memoization to prevent unnecessary re-rendering
    const sidebarMemo = useMemo(() => (
        <Sidebar
            model={model}
            availableModels={availableModels}
            onModelChange={handleModelChange}
            onNewChat={handleNewChat}
            onLoadChat={handleLoadChat}
            activeChatId={activeChatId}
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            refreshTrigger={chatListRefresh}
        />
    ), [model, availableModels, handleModelChange, handleNewChat, handleLoadChat, activeChatId, 
        isSidebarOpen, chatListRefresh]);

    const chatInputMemo = useMemo(() => (
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
    ), [input, isStreaming, handleSubmit, handleStopGeneration, model, availableModels, handleModelChange]);

    // Register cleanup handlers
    useEffect(() => {
        // Register cleanup for memory management
        registerCleanup('chat', () => {
            // Clear large objects from memory when component unmounts
            setMessages([]);
            setStreamingContent('');
        });
        
        return () => {
            // Perform additional cleanup when component unmounts
            cancelUpdateStreamingRef.current?.();
        };
    }, []);

    if (serviceError) {
        return <ServiceError onRetry={handleRetry} />;
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 overflow-hidden">
            {sidebarMemo}
            <main className={`
                flex-1 flex flex-col min-w-0
                transition-all duration-300 ease-in-out
                ${!isSidebarOpen ? 'pl-16' : 'pl-64'}
            `}>
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent" id="chat-scroll-container">
                    <div className="max-w-4xl mx-auto w-full px-4 py-6 pb-36">
                        {/* Increased bottom padding from pb-20 to pb-36 to prevent text from hiding under the input */}
                        
                        {messages.length === 0 ? (
                            <div className="h-[calc(100vh-12rem)] flex flex-col items-center justify-center text-gray-500">
                                <div className="bg-white/50 dark:bg-gray-800/50 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mb-4">
                                    <h1 className="text-xl font-medium text-center text-brand-600 dark:text-brand-400 mb-2">Welcome to Ariaj Chat</h1>
                                    <p className="text-center text-gray-600 dark:text-gray-400">
                                        Start a conversation with the AI assistant using the input box below.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4" key={renderKey}>
                                {/* Basic message layout without virtualization */}
                                <div className="flex flex-col space-y-4">
                                    {messages.map((message, index) => (
                                        <div key={index} className="animate-once animate-fade-up animate-duration-300">
                                            <MemoizedChatMessage message={message} />
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Streaming message with consistent styling */}
                                {isStreaming && (
                                    <div className="mb-4 animate-once animate-fade-up animate-duration-300">
                                        <MemoizedStreamingMessage 
                                            content={streamingContent} 
                                            isComplete={false} 
                                        />
                                    </div>
                                )}
                                
                                {/* Scroll anchor */}
                                <div ref={messagesEndRef} className="h-1"></div>
                            </div>
                        )}
                    </div>
                </div>
                <footer className={`
                    fixed bottom-0 left-0 right-0 z-10 py-2 px-4 
                    bg-white/90 dark:bg-gray-800/95 
                    backdrop-blur-md border-t border-gray-200 dark:border-gray-700
                    transition-all duration-300 ease-in-out
                    ${!isSidebarOpen ? 'ml-16' : 'ml-64'}
                `}>
                    <div className="max-w-4xl mx-auto w-full">
                        {chatInputMemo}
                    </div>
                </footer>
            </main>
        </div>
    );
};

// Improved debounce function with proper typings and cleanup
function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): {
    (...args: Parameters<T>): void;
    cancel?: () => void;
} {
    let timeout: NodeJS.Timeout | null = null;
    
    const debouncedFn = function(...args: Parameters<T>): void {
        if (timeout) {
            clearTimeout(timeout);
        }
        
        timeout = setTimeout(() => {
            func(...args);
            timeout = null;
        }, wait);
    };
    
    debouncedFn.cancel = () => {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
    };
    
    return debouncedFn;
}

export default React.memo(Chat);
