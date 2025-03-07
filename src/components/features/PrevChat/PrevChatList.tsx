import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChatInfo } from '../../LocDB/models';
import { db } from '../../LocDB/ChatDatabase';
import { PrevChatItem } from './PrevChatItem';
import { MessageSquareDashed, Search } from 'lucide-react';

// Constants - fixed syntax
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ITEM_HEIGHT = 60; // Replace placeholder with actual value
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BUFFER_ITEMS = 5; // Replace placeholder with actual value

interface PrevChatListProps {
    activeChatId?: number;
    onChatSelect: (chatId: number) => void;
    refreshTrigger?: number;
}

interface GroupedChats {
    title: string;
    chats: (ChatInfo & { preview?: string })[];
}

// Memoized chat item for better performance
const MemoizedPrevChatItem = React.memo(PrevChatItem);

export const PrevChatList: React.FC<PrevChatListProps> = ({
    activeChatId,
    onChatSelect,
    refreshTrigger = 0
}) => {
    const [chats, setChats] = useState<(ChatInfo & { preview?: string })[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollPosition, setScrollPosition] = useState(0);
    
    // Cache for previews to avoid re-fetching
    const previewCache = useRef<Record<number, string>>({});

    // Optimized chat loading
    const loadChats = useCallback(async () => {
        setLoading(true);
        try {
            const allChats = await db.getAllChats();
            
            // Process chats in a background task
            setTimeout(async () => {
                const chatsWithPreview = await Promise.all(
                    allChats.map(async (chat) => {
                        if (chat.id) {
                            // Use cache if available
                            if (previewCache.current[chat.id]) {
                                return {
                                    ...chat,
                                    preview: previewCache.current[chat.id]
                                };
                            }
                            
                            // Get last message only for visible chats or active chat
                            if (chat.id === activeChatId) {
                                const messages = await db.getMessages(chat.id);
                                const lastMessage = messages[messages.length - 1];
                                const preview = lastMessage?.content.substring(0, 60) || '';
                                
                                // Cache the result
                                previewCache.current[chat.id] = preview;
                                
                                return {
                                    ...chat,
                                    preview
                                };
                            }
                            
                            return {
                                ...chat,
                                preview: ''
                            };
                        }
                        return chat;
                    })
                );
                
                setChats(chatsWithPreview);
                setLoading(false);
            }, 0);
        } catch (error) {
            console.error('Failed to load chats:', error);
            setLoading(false);
        }
    }, [activeChatId]);

    // Lazy load preview text for visible items
    const loadVisiblePreviews = useCallback(async (visibleChats: (ChatInfo & { preview?: string })[]) => {
        const previewPromises = visibleChats
            .filter(chat => !chat.preview && chat.id && !previewCache.current[chat.id])
            .map(async (chat) => {
                if (!chat.id) return null;
                try {
                    const messages = await db.getMessages(chat.id);
                    const lastMessage = messages[messages.length - 1];
                    const preview = lastMessage?.content.substring(0, 60) || '';
                    
                    // Update cache
                    previewCache.current[chat.id] = preview;
                    
                    return {
                        id: chat.id,
                        preview
                    };
                } catch {
                    return null;
                }
            });
            
        const results = await Promise.all(previewPromises);
        const validResults = results.filter(Boolean) as { id: number; preview: string }[];
        
        if (validResults.length > 0) {
            setChats(currentChats => 
                currentChats.map(chat => {
                    const match = validResults.find(r => r.id === chat.id);
                    if (match) {
                        return { ...chat, preview: match.preview };
                    }
                    return chat;
                })
            );
        }
    }, []);

    // Reload chats when needed
    useEffect(() => {
        loadChats();
    }, [loadChats, activeChatId, refreshTrigger]);

    // Handle deleting chat efficiently
    const handleChatDelete = useCallback(async (chatId: number) => {
        try {
            // Optimistic UI update
            setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
            
            // Delete from cache
            if (previewCache.current[chatId]) {
                delete previewCache.current[chatId];
            }
            
            // Actually delete from DB (async)
            await db.deleteChat(chatId);
        } catch (error) {
            console.error('Failed to delete chat:', error);
            // Revert on error by reloading chats
            loadChats();
        }
    }, [loadChats]);

    // Efficiently group chats by date
    const groupChatsByDate = useCallback((chatsArray: (ChatInfo & { preview?: string })[]) => {
        // Use short-circuit evaluation to optimize filtering
        const filteredChats = searchQuery.trim() 
            ? chatsArray.filter(chat => {
                const matchesTitle = chat.title.toLowerCase().includes(searchQuery.toLowerCase());
                if (matchesTitle) return true; // Early return if title matches
                
                return chat.preview?.toLowerCase().includes(searchQuery.toLowerCase());
              })
            : chatsArray;

        if (filteredChats.length === 0) return [];
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const lastWeekTimestamp = today.getTime() - 7 * 24 * 60 * 60 * 1000;
        const lastMonthTimestamp = today.getTime() - 30 * 24 * 60 * 60 * 1000;
        
        const todayTimestamp = today.getTime();
        const yesterdayTimestamp = yesterday.getTime();
        
        const groups: GroupedChats[] = [
            { title: 'Today', chats: [] },
            { title: 'Yesterday', chats: [] },
            { title: 'This Week', chats: [] },
            { title: 'This Month', chats: [] },
            { title: 'Older', chats: [] }
        ];
        
        // Faster date comparison using timestamps
        for (const chat of filteredChats) {
            const chatTimestamp = new Date(chat.updated).setHours(0, 0, 0, 0);
            
            if (chatTimestamp === todayTimestamp) {
                groups[0].chats.push(chat);
            } else if (chatTimestamp === yesterdayTimestamp) {
                groups[1].chats.push(chat);
            } else if (chatTimestamp > lastWeekTimestamp) {
                groups[2].chats.push(chat);
            } else if (chatTimestamp > lastMonthTimestamp) {
                groups[3].chats.push(chat);
            } else {
                groups[4].chats.push(chat);
            }
        }
        
        return groups.filter(group => group.chats.length > 0);
    }, [searchQuery]);
    
    // Only recompute grouped chats when dependencies change
    const groupedChats = useMemo(() => groupChatsByDate(chats), [groupChatsByDate, chats]);

    // Calculate visibleItems based on scroll position for virtual list
    useEffect(() => {
        if (!containerRef.current) return;
        
        const handleScroll = () => {
            if (containerRef.current) {
                setScrollPosition(containerRef.current.scrollTop);
            }
        };
        
        const container = containerRef.current;
        container.addEventListener('scroll', handleScroll);
        return () => {
            container.removeEventListener('scroll', handleScroll);
        };
    }, []);
    
    // Calculate visible group items and trigger lazy loading of previews
    useEffect(() => {
        if (groupedChats.length === 0) return;
        
        // Determine visible chats based on scroll position
        const visibleChats: (ChatInfo & { preview?: string })[] = [];
        
        // Flatten groups to find visible items
        for (const group of groupedChats) {
            for (const chat of group.chats) {
                visibleChats.push(chat);
                if (visibleChats.length >= 10) break; // Limit initial load
            }
            if (visibleChats.length >= 10) break;
        }
        
        // Load previews for visible chats
        if (visibleChats.length > 0) {
            loadVisiblePreviews(visibleChats);
        }
    }, [groupedChats, scrollPosition, loadVisiblePreviews]);

    // Optimize search input 
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    }, []);

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
        <div className="space-y-2" ref={containerRef}>
            {/* Search box - memoize input to reduce re-renders */}
            <div className="relative mb-3">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-brand-400 dark:text-brand-600">
                    <Search size={14} />
                </div>
                <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={handleSearchChange}
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
                                <MemoizedPrevChatItem
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

// Use memo to prevent unnecessary re-renders
export default React.memo(PrevChatList);
