import React, { useState, useEffect } from 'react';
import { ChatInfo } from '../../LocDB/models';
import { db } from '../../LocDB/ChatDatabase';
import { PrevChatItem } from './PrevChatItem';
import { MessageSquareDashed, Search } from 'lucide-react';

interface PrevChatListProps {
    activeChatId?: number;
    onChatSelect: (chatId: number) => void;
    refreshTrigger?: number; // Add this prop to force refresh
}

interface GroupedChats {
    title: string;
    chats: (ChatInfo & { preview?: string })[];
}

export const PrevChatList: React.FC<PrevChatListProps> = ({
    activeChatId,
    onChatSelect,
    refreshTrigger = 0
}) => {
    const [chats, setChats] = useState<(ChatInfo & { preview?: string })[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Reload chats when activeChatId changes or refreshTrigger changes
    useEffect(() => {
        loadChats();
    }, [activeChatId, refreshTrigger]);

    const loadChats = async () => {
        setLoading(true);
        try {
            const allChats = await db.getAllChats();
            
            // Get preview text for each chat
            const chatsWithPreview = await Promise.all(
                allChats.map(async (chat) => {
                    if (chat.id) {
                        const messages = await db.getMessages(chat.id);
                        const lastMessage = messages[messages.length - 1];
                        return {
                            ...chat,
                            preview: lastMessage?.content.substring(0, 60) || ''
                        };
                    }
                    return chat;
                })
            );
            
            setChats(chatsWithPreview);
        } catch (error) {
            console.error('Failed to load chats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChatDelete = async (chatId: number) => {
        try {
            await db.deleteChat(chatId);
            // Update the list
            setChats(chats.filter(chat => chat.id !== chatId));
        } catch (error) {
            console.error('Failed to delete chat:', error);
        }
    };

    const groupChatsByDate = (chatsArray: (ChatInfo & { preview?: string })[]) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        
        const groups: GroupedChats[] = [
            { title: 'Today', chats: [] },
            { title: 'Yesterday', chats: [] },
            { title: 'This Week', chats: [] },
            { title: 'This Month', chats: [] },
            { title: 'Older', chats: [] }
        ];
        
        const filteredChats = searchQuery 
            ? chatsArray.filter(chat => 
                chat.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                chat.preview?.toLowerCase().includes(searchQuery.toLowerCase()))
            : chatsArray;

        for (const chat of filteredChats) {
            const chatDate = new Date(chat.updated);
            chatDate.setHours(0, 0, 0, 0);
            
            if (chatDate.getTime() === today.getTime()) {
                groups[0].chats.push(chat);
            } else if (chatDate.getTime() === yesterday.getTime()) {
                groups[1].chats.push(chat);
            } else if (chatDate > lastWeek) {
                groups[2].chats.push(chat);
            } else if (chatDate > lastMonth) {
                groups[3].chats.push(chat);
            } else {
                groups[4].chats.push(chat);
            }
        }
        
        // Only return groups that have chats
        return groups.filter(group => group.chats.length > 0);
    };
    
    const groupedChats = groupChatsByDate(chats);

    if (loading) {
        return (
            <div className="py-4 text-center text-brand-400 dark:text-brand-600 animate-pulse">
                <div className="flex justify-center items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-brand-400 dark:bg-brand-600 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-brand-400 dark:bg-brand-600 rounded-full animate-bounce animation-delay-200"></div>
                    <div className="w-1.5 h-1.5 bg-brand-400 dark:bg-brand-600 rounded-full animate-bounce animation-delay-400"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {/* Search box */}
            <div className="relative mb-3">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-brand-400 dark:text-brand-600">
                    <Search size={14} />
                </div>
                <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 w-full bg-brand-50/30 dark:bg-brand-900/20 
                             border border-brand-100 dark:border-brand-800
                             rounded-md text-sm text-brand-900 dark:text-brand-100
                             placeholder:text-brand-400 dark:placeholder:text-brand-600
                             focus:outline-none focus:ring-1 focus:ring-brand-400 dark:focus:ring-brand-600"
                />
            </div>

            {groupedChats.length === 0 ? (
                <div className="py-4 text-center text-brand-400 dark:text-brand-600 flex flex-col items-center gap-2">
                    <MessageSquareDashed size={24} />
                    <span className="text-sm">
                        {searchQuery ? 'No matching conversations' : 'No chat history'}
                    </span>
                </div>
            ) : (
                groupedChats.map((group, index) => (
                    <div key={index} className="mb-3">
                        <div className="text-xs font-medium uppercase text-brand-500 dark:text-brand-400 mb-1 px-2">
                            {group.title}
                        </div>
                        <div className="space-y-1">
                            {group.chats.map(chat => (
                                <PrevChatItem
                                    key={chat.id}
                                    chat={chat}
                                    isActive={activeChatId === chat.id}
                                    onSelect={() => chat.id && onChatSelect(chat.id)}
                                    onDelete={() => chat.id && handleChatDelete(chat.id)}
                                    previewText={chat.preview}
                                />
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};
