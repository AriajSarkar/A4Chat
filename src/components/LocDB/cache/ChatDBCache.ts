import { ChatInfo, MessageInfo } from '../models';

/**
 * Handles caching of chat and message data to reduce database access
 */
export class ChatDBCache {
    private chatCache: Map<number, ChatInfo> = new Map();
    private messageCache: Map<number, MessageInfo[]> = new Map();

    // Chat cache operations
    getCachedChat(id: number): ChatInfo | undefined {
        return this.chatCache.get(id);
    }

    setCachedChat(id: number, chat: ChatInfo): void {
        this.chatCache.set(id, chat);
    }

    updateCachedChat(id: number, updates: Partial<ChatInfo>): void {
        const chat = this.chatCache.get(id);
        if (chat) {
            this.chatCache.set(id, { ...chat, ...updates });
        }
    }

    removeCachedChat(id: number): void {
        this.chatCache.delete(id);
        this.messageCache.delete(id);
    }

    getCachedChats(): ChatInfo[] {
        return Array.from(this.chatCache.values());
    }

    // Message cache operations
    getCachedMessages(chatId: number): MessageInfo[] | undefined {
        return this.messageCache.get(chatId);
    }

    setCachedMessages(chatId: number, messages: MessageInfo[]): void {
        this.messageCache.set(chatId, messages);
    }

    addCachedMessage(message: MessageInfo): void {
        const messages = this.messageCache.get(message.chatId) || [];
        messages.push(message);
        this.messageCache.set(message.chatId, messages);
    }

    // Memory management
    clear(): void {
        this.chatCache.clear();
        this.messageCache.clear();
    }

    prune(maxChatEntries = 10): void {
        if (this.chatCache.size > maxChatEntries) {
            // Get all chats and sort by updated date
            const chats = Array.from(this.chatCache.entries())
                .sort(([, chatA], [, chatB]) => {
                    return new Date(chatB.updated).getTime() - new Date(chatA.updated).getTime();
                });
            
            // Keep only the most recent ones
            const outdatedChats = chats.slice(maxChatEntries);
            outdatedChats.forEach(([id]) => {
                this.chatCache.delete(id);
                this.messageCache.delete(id);
            });
        }
    }

    hasCachedChat(id: number): boolean {
        return this.chatCache.has(id);
    }

    hasCachedMessages(chatId: number): boolean {
        return this.messageCache.has(chatId);
    }
}
