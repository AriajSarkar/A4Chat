import { Dexie, Table } from 'dexie';
import { ChatInfo, MessageInfo } from './models';
import { ChatDBCache } from './cache/ChatDBCache';
import { OperationQueue } from './queue/OperationQueue';
import { BatchProcessor } from './batch/BatchProcessor';

class ChatDB extends Dexie {
    chats!: Table<ChatInfo, number>;
    messages!: Table<MessageInfo, number>;
    
    // Component instances for separation of concerns
    private cache: ChatDBCache;
    private queue: OperationQueue;
    private batchProcessor: BatchProcessor;

    constructor() {
        super('A4ChatDatabase');
        
        // Define DB schema
        this.version(1).stores({
            chats: '++id, title, model, created, updated',
            messages: '++id, chatId, role, timestamp'
        });
        
        // Initialize components
        this.cache = new ChatDBCache();
        this.queue = new OperationQueue();
        
        // Setup hooks for cache management
        this.chats.hook('updating', (modifications, primKey) => {
            // Update cache if the chat is already cached
            if (this.cache.hasCachedChat(primKey as number)) {
                this.cache.updateCachedChat(primKey as number, modifications);
            }
        });
        
        this.chats.hook('deleting', (primKey) => {
            // Remove from cache when deleted
            this.cache.removeCachedChat(primKey as number);
        });
        
        // Initialize batch processor with the database instance and chats table
        this.batchProcessor = new BatchProcessor(this, this.chats);
    }

    async createChat(title: string, model: string): Promise<number> {
        return this.queue.enqueue(async () => {
            const now = new Date();
            const chatInfo: ChatInfo = {
                title,
                model,
                created: now,
                updated: now,
                messageCount: 0
            };
            
            const id = await this.chats.add(chatInfo);
            
            // Update cache
            chatInfo.id = id as number;
            this.cache.setCachedChat(id as number, chatInfo);
            this.cache.setCachedMessages(id as number, []);
            
            return id as number;
        });
    }

    async getChat(id: number): Promise<ChatInfo | undefined> {
        // Return from cache if available
        const cachedChat = this.cache.getCachedChat(id);
        if (cachedChat) {
            return cachedChat;
        }
        
        // Otherwise fetch from DB and update cache
        return this.queue.enqueue(async () => {
            const chat = await this.chats.get(id);
            if (chat) {
                this.cache.setCachedChat(id, chat);
            }
            return chat;
        });
    }

    async getAllChats(): Promise<ChatInfo[]> {
        return this.queue.enqueue(async () => {
            const chats = await this.chats.orderBy('updated').reverse().toArray();
            
            // Update cache with fetched chats
            chats.forEach(chat => {
                if (chat.id) {
                    this.cache.setCachedChat(chat.id, chat);
                }
            });
            
            return chats;
        });
    }

    async updateChatTitle(id: number, title: string): Promise<void> {
        // Schedule update for batching
        const key = `chat:${id}:title`;
        this.batchProcessor.scheduleUpdate(key, { id, title });
        
        // Optimistically update cache
        const chat = this.cache.getCachedChat(id);
        if (chat) {
            this.cache.setCachedChat(id, {
                ...chat,
                title,
                updated: new Date()
            });
        }
    }

    async deleteChat(id: number): Promise<void> {
        return this.queue.enqueue(async () => {
            await this.transaction('rw', this.chats, this.messages, async () => {
                await this.messages.where('chatId').equals(id).delete();
                await this.chats.delete(id);
            });
            
            // Remove from cache (hook will handle this, but we do it explicitly to be safe)
            this.cache.removeCachedChat(id);
        });
    }

    async addMessage(chatId: number, role: 'user' | 'assistant' | 'system', content: string): Promise<number> {
        return this.queue.enqueue(async () => {
            const now = new Date();
            const messageInfo: MessageInfo = {
                chatId,
                role,
                content,
                timestamp: now
            };
            
            const messageId = await this.messages.add(messageInfo);
            
            // Update the cache
            messageInfo.id = messageId as number;
            this.cache.addCachedMessage(messageInfo);

            // Update the chat's updated timestamp and message count
            await this.transaction('rw', this.chats, async () => {
                const chat = await this.chats.get(chatId);
                if (chat) {
                    // Update cached chat info
                    const updatedChat = {
                        ...chat,
                        updated: now,
                        messageCount: chat.messageCount + 1,
                        // Update title based on first user message if it's generic
                        title: chat.title === 'New Conversation' && role === 'user' 
                            ? content.substring(0, 30) + (content.length > 30 ? '...' : '')
                            : chat.title
                    };
                    
                    await this.chats.update(chatId, updatedChat);
                    this.cache.setCachedChat(chatId, updatedChat);
                }
            });

            return messageId as number;
        });
    }

    async getMessages(chatId: number): Promise<MessageInfo[]> {
        // Return from cache if available
        const cachedMessages = this.cache.getCachedMessages(chatId);
        if (cachedMessages) {
            return cachedMessages;
        }
        
        return this.queue.enqueue(async () => {
            const messages = await this.messages
                .where('chatId')
                .equals(chatId)
                .sortBy('timestamp');
            
            // Cache the results
            this.cache.setCachedMessages(chatId, messages);
            
            return messages;
        });
    }
    
    // Memory management methods
    clearCache(): void {
        this.cache.clear();
    }
    
    pruneCache(maxChatEntries = 10): void {
        this.cache.prune(maxChatEntries);
    }
    
    // Resource cleanup
    cleanup(): void {
        this.batchProcessor.cleanup();
        this.queue.clear();
        this.cache.clear();
    }
}

export const db = new ChatDB();

// Export a function to cleanup resources when needed
export function cleanupDB(): void {
    db.cleanup();
}
