import { ChatMessage } from '../../../types/ChatMessage';

export interface ModelManagerHook {
    model: string;
    availableModels: string[];
    serviceError: boolean;
    handleModelChange: (newModel: string, activeChatId?: number) => void;
    loadModels: () => Promise<void>;
    handleRetry: () => void;
}

export interface ChatStateManagerHook {
    messages: ChatMessage[];
    activeChatId: number | undefined;
    chatListRefresh: number;
    handleNewChat: () => void;
    handleLoadChat: (chatId: number, availableModels: string[], setModel: (model: string) => void) => Promise<void>;
    ensureActiveChatExists: (model: string) => Promise<number>;
    addUserMessage: (content: string, chatId: number) => Promise<void>;
    addAssistantMessage: (content: string, chatId: number) => Promise<void>;
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export interface StreamingManagerHook {
    streamingContent: string;
    isStreaming: boolean;
    renderKey: number;
    updateStreamingContent: (content: string) => void;
    cancelUpdateStreamingRef: React.MutableRefObject<(() => void) | undefined>;
    handleStopGeneration: (activeChatId?: number, setMessages?: React.Dispatch<React.SetStateAction<ChatMessage[]>>) => void;
    setIsStreaming: (value: boolean) => void;
    setStreamingContent: (content: string) => void;
    setRenderKey: React.Dispatch<React.SetStateAction<number>>;
}

export interface ChatHandlersHook {
    input: string;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    handleSubmit: (e: React.FormEvent, model: string) => Promise<void>;
}
