import React from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { ChatInfo } from '../../LocDB/models';
import { formatRelativeTime } from '@/utils/dateUtils';

interface PrevChatItemProps {
    chat: ChatInfo;
    isActive: boolean;
    onSelect: () => void;
    onDelete: () => void;
    previewText?: string; // Optional preview of last message
}

export const PrevChatItem: React.FC<PrevChatItemProps> = ({
    chat,
    isActive,
    onSelect,
    onDelete,
    previewText
}) => {
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering onSelect
        onDelete();
    };

    return (
        <div
            className={`
                group flex items-start gap-2.5 py-2.5 px-3 rounded-lg
                cursor-pointer mb-1.5 transition-all duration-200 
                relative overflow-hidden
                ${isActive 
                  ? 'bg-brand-50/80 dark:bg-brand-900/40 border-l-2 border-brand-500 dark:border-brand-400 shadow-sm' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-2 border-transparent'}
            `}
            onClick={onSelect}
        >
            <div className={`
                flex-shrink-0 p-1 rounded
                ${isActive ? 'text-brand-500 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-brand-500 dark:group-hover:text-brand-400'}
            `}>
                <MessageSquare size={16} />
            </div>
            <div className="flex-1 min-w-0">
                <div className={`
                    text-sm font-medium truncate transition-colors
                    ${isActive 
                      ? 'text-brand-700 dark:text-brand-300' 
                      : 'text-gray-700 dark:text-gray-300 group-hover:text-brand-600 dark:group-hover:text-brand-400'}
                `}>
                    {chat.title}
                </div>
                
                {/* Message preview with fade out effect */}
                {previewText && (
                    <div className="text-xs text-gray-500/80 dark:text-gray-400/60 truncate mt-0.5 
                                    max-w-[180px] overflow-hidden">
                        {previewText}
                    </div>
                )}
                
                <div className="text-xs text-gray-500 dark:text-gray-500/70 mt-1 flex items-center">
                    <span className="inline-flex items-center">
                        {formatRelativeTime(chat.updated)}
                    </span>
                    
                    {/* Chat message count badge */}
                    {chat.messageCount > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800/40 
                                        text-gray-600 dark:text-gray-400 rounded-full text-[10px]">
                            {chat.messageCount}
                        </span>
                    )}
                </div>
            </div>
            
            {/* Delete button with improved animation */}
            {!isActive && (
                <button 
                    onClick={handleDelete}
                    className="opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out
                            absolute right-2 top-1/2 -translate-y-1/2 p-1.5
                            hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500
                            transform group-hover:scale-100 scale-75"
                    aria-label="Delete chat"
                    title="Delete chat"
                >
                    <Trash2 size={14} />
                </button>
            )}

            {/* Active indicator dot */}
            {isActive && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-500 dark:bg-brand-400 animate-pulse">
                        
                    </div>
                </div>
            )}
        </div>
    );
};
