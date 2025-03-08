import React, 
    { 
        useRef, 
        useEffect, 
        useCallback, 
        useMemo, 
        useState, 
        memo 
    } 
from 'react';
import { ServiceError } from '../../features/Services/ServiceError';
import { ChatInput } from './components/ChatInput';
import { throttle as throttleUtil, registerCleanup } from '@/utils/performance';
import EmptyChatView from './components/EmptyChatView';
import ChatMessages from './components/ChatDisplay';
import ChatLayout from './components/ChatLayout';
import { useModelManager } from './hooks/useModelManager';
import { useChatStateManager } from './hooks/useChatStateManager';
import { useStreamingManager } from './hooks/useStreamingManager';
import { useChatHandlers } from './hooks/useChatHandlers';

const Chat: React.FC = () => {
    // Custom hooks
    const { 
        model, 
        availableModels, 
        serviceError, 
        handleModelChange, 
        loadModels, 
        handleRetry 
    } = useModelManager();
    
    const { 
        messages, 
        activeChatId, 
        chatListRefresh, 
        handleNewChat, 
        handleLoadChat, 
        ensureActiveChatExists, 
        addUserMessage, 
        addAssistantMessage,
        setMessages
    } = useChatStateManager();
    
    const { 
        streamingContent, 
        isStreaming, 
        renderKey, 
        updateStreamingContent, 
        cancelUpdateStreamingRef, 
        handleStopGeneration,
        setIsStreaming,
        setStreamingContent,
        setRenderKey
    } = useStreamingManager(addAssistantMessage);
    
    const { 
        input, 
        setInput, 
        handleSubmit 
    } = useChatHandlers(
        ensureActiveChatExists,
        addUserMessage,
        addAssistantMessage,
        updateStreamingContent,
        setIsStreaming,
        setStreamingContent,
        setRenderKey
    );
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // Load models on mount
    useEffect(() => {
        loadModels();
    }, [loadModels]);
    
    // Handle scrolling
    const throttledScrollToBottom = useCallback(throttleUtil(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100), [messagesEndRef]);
    
    useEffect(() => {
        if (messages.length > 0) {
            throttledScrollToBottom();
        }
    }, [messages, throttledScrollToBottom]);
    
    useEffect(() => {
        if (isStreaming && streamingContent) {
            requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
            });
        }
    }, [isStreaming, streamingContent]);
    
    // Cleanup on unmount
    useEffect(() => {
        registerCleanup('chat', () => {
            setMessages([]);
            setStreamingContent('');
        });
        
        return () => {
            cancelUpdateStreamingRef.current?.();
        };
    }, [setMessages, setStreamingContent]);
    
    // Memoized props
    const sidebarProps = useMemo(() => ({
        model,
        availableModels,
        onModelChange: (newModel: string) => handleModelChange(newModel, activeChatId),
        onNewChat: handleNewChat,
        onLoadChat: (chatId: number) => handleLoadChat(chatId, availableModels, (newModel) => handleModelChange(newModel)),
        activeChatId,
        isOpen: isSidebarOpen,
        onToggle: () => setIsSidebarOpen(!isSidebarOpen),
        refreshTrigger: chatListRefresh
    }), [model, availableModels, handleModelChange, activeChatId, handleNewChat, handleLoadChat, isSidebarOpen, chatListRefresh]);

    const chatInputMemo = useMemo(() => (
        <ChatInput
            input={input}
            isLoading={isStreaming}
            onInputChange={setInput}
            onSubmit={(e) => handleSubmit(e, model)}
            onStop={() => handleStopGeneration(activeChatId, setMessages)}
            model={model}
            availableModels={availableModels}
            onModelChange={(newModel) => handleModelChange(newModel, activeChatId)}
        />
    ), [input, isStreaming, handleSubmit, model, handleStopGeneration, activeChatId, setMessages, availableModels, handleModelChange]);

    if (serviceError) {
        return <ServiceError onRetry={handleRetry} />;
    }

    return (
        <ChatLayout 
            sidebarProps={sidebarProps}
            footerContent={chatInputMemo}
            isSidebarOpen={isSidebarOpen}
        >
            {messages.length === 0 ? (
                <EmptyChatView />
            ) : (
                <ChatMessages
                    messages={messages}
                    isStreaming={isStreaming}
                    streamingContent={streamingContent}
                    renderKey={renderKey}
                    messagesEndRef={messagesEndRef}
                />
            )}
        </ChatLayout>
    );
};

export default memo(Chat);
