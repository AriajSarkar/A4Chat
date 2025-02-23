import React from 'react';
import { ModelSelector } from '../features/chat/ModelSelector';

interface SidebarProps {
    model: string;
    availableModels: string[];
    onModelChange: (model: string) => void;
    onNewChat: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    model,
    availableModels,
    onModelChange,
    onNewChat
}) => {
    return (
        <div className="w-64 bg-gray-900 text-white p-4">
            <button 
                className="w-full bg-white/10 hover:bg-white/20 rounded-lg p-3 mb-4 text-left"
                onClick={onNewChat}
            >
                + New Chat
            </button>
            <ModelSelector
                model={model}
                availableModels={availableModels}
                onModelChange={onModelChange}
            />
            <div className="border-t border-white/20 pt-4">
                <h3 className="text-xs text-gray-400 font-medium mb-2">Previous Chats</h3>
            </div>
        </div>
    );
};
