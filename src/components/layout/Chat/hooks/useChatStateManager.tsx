import { useState, useCallback } from 'react';
import { ChatMessage } from '@/components/types/ChatMessage';
import { db } from '@/components/LocDB/ChatDatabase';
import { updateLastUsedModel } from '@/utils/config';

export const useChatStateManager = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [activeChatId, setActiveChatId] = useState<number | undefined>(undefined);
    const [chatListRefresh, setChatListRefresh] = useState<number>(0);

    const handleNewChat = useCallback(() => {
        setMessages([]);
        setActiveChatId(undefined);
        setChatListRefresh(prev => prev + 1);
    }, []);

    const handleLoadChat = useCallback(async (chatId: number, availableModels: string[], setModel: (model: string) => void) => {
        try {
            const chat = await db.getChat(chatId);
            if (!chat) return;
            
            if (chat.model && availableModels.includes(chat.model)) {
                setModel(chat.model);
                updateLastUsedModel(chat.model);
            }
            
            const chatMessages = await db.getMessages(chatId);
            
            const uiMessages: ChatMessage[] = chatMessages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            
            setMessages(uiMessages);
            setActiveChatId(chatId);
        } catch (error) {
            console.error('Failed to load chat:', error);
        }
    }, []);

    const ensureActiveChatExists = useCallback(async (model: string): Promise<number> => {
        if (activeChatId) return activeChatId;
        
        const newChatId = await db.createChat('New Conversation', model);
        setActiveChatId(newChatId);
        setChatListRefresh(prev => prev + 1);
        return newChatId;
    }, [activeChatId]);

    const addUserMessage = useCallback(async (content: string, chatId: number) => {
        const userMessage: ChatMessage = {
            role: 'user',
            content
        };
        
        setMessages(prev => [...prev, userMessage]);
        await db.addMessage(chatId, 'user', content);
    }, []);

    const addAssistantMessage = useCallback(async (content: string, chatId: number) => {
        const assistantMessage: ChatMessage = {
            role: 'assistant',
            content
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        await db.addMessage(chatId, 'assistant', content);
        setChatListRefresh(prev => prev + 1);
    }, []);

    return {
        messages,
        activeChatId,
        chatListRefresh,
        handleNewChat,
        handleLoadChat,
        ensureActiveChatExists,
        addUserMessage,
        addAssistantMessage,
        setMessages,
        setChatListRefresh
    };
};
