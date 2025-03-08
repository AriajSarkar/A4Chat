import { useState, useCallback } from 'react';
import { OllamaAPI } from '@/utils/API/api';
import { loadConfig, updateLastUsedModel } from '@/utils/config';
import { db } from '@/components/LocDB/ChatDatabase';

export const useModelManager = () => {
    const [model, setModel] = useState<string>('');
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [serviceError, setServiceError] = useState(false);

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

    const handleModelChange = useCallback((newModel: string, activeChatId?: number) => {
        setModel(newModel);
        updateLastUsedModel(newModel);
        if (activeChatId) {
            updateChatModel(activeChatId, newModel);
        }
    }, [updateChatModel]);

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

    const handleRetry = useCallback(() => {
        setServiceError(false);
        loadModels();
    }, [loadModels]);

    return {
        model,
        availableModels,
        serviceError,
        handleModelChange,
        loadModels,
        handleRetry
    };
};
