import Dexie, { Table } from 'dexie';
import { ChatInfo, MessageInfo } from './models';

// Queue for database operations
interface DBOperation {
    execute: () => Promise<any>;
    resolve: (result: any) => void;
    reject: (error: any) => void;
}

class ChatDB extends Dexie {
    chats!: Table<ChatInfo, number>;
    messages!: Table<MessageInfo, number>;
    
    // Caching and operational improvements
    private chatCache: Map<number, ChatInfo> = new Map();
    private messageCache: Map<number, MessageInfo[]> = new Map();
    private operationQueue: DBOperation[] = [];
    private isProcessingQueue = false;
    private batchTimeoutId: NodeJS.Timeout | null = null;
    private pendingUpdates: Map<string, any> = new Map();

    constructor() {
        super('A4ChatDatabase');
        
        // Define DB schema
        this.version(1).stores({
            chats: '++id, title, model, created, updated',
            messages: '++id, chatId, role, timestamp'
        });
        
        // Add hooks for cache management - fix unused parameters
        this.chats.hook('creating', function() {
            // Cache will be updated in the method that calls add()
        });
        
        this.chats.hook('updating', (modifications, primKey) => {
            // Update cache if the chat is already cached
            if (this.chatCache.has(primKey as number)) {
                const chat = this.chatCache.get(primKey as number);
                if (chat) {
                    this.chatCache.set(primKey as number, { ...chat, ...modifications });
                }
            }
        });
        
        this.chats.hook('deleting', (primKey) => {
            // Remove from cache when deleted
            this.chatCache.delete(primKey as number);
            this.messageCache.delete(primKey as number);
        });
        
        // Fix the messages.hook - using arrow function instead of this alias
        this.messages.hook('creating', (primKey, obj) => {
            // Check if obj exists before accessing its properties
            if (obj && obj.chatId !== undefined) {
                const chatId = obj.chatId;
                if (this.messageCache.has(chatId)) {
                    // Will be updated in the method that calls add()
                }
            }
        });
    }
    
    // Helper for batching database operations
    private async enqueueOperation<T>(operation: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.operationQueue.push({
                execute: operation,
                resolve,
                reject
            });
            
            if (!this.isProcessingQueue) {
                this.processQueue();
            }
        });
    }
    
    private async processQueue(): Promise<void> {
        if (this.operationQueue.length === 0) {
            this.isProcessingQueue = false;
            return;
        }
        
        this.isProcessingQueue = true;
        const operation = this.operationQueue.shift();
        
        try {
            const result = await operation!.execute();
            operation!.resolve(result);
        } catch (error) {
            operation!.reject(error);
        } finally {
            // Process next item with a small delay to allow UI updates
            setTimeout(() => this.processQueue(), 0);
        }
    }

    async createChat(title: string, model: string): Promise<number> {
        return this.enqueueOperation(async () => {
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
            this.chatCache.set(id as number, chatInfo);
            this.messageCache.set(id as number, []);
            
            return id as number;
        });
    }

    async getChat(id: number): Promise<ChatInfo | undefined> {
        // Return from cache if available
        if (this.chatCache.has(id)) {
            return this.chatCache.get(id);
        }
        
        // Otherwise fetch from DB and update cache
        return this.enqueueOperation(async () => {
            const chat = await this.chats.get(id);
            if (chat) {
                this.chatCache.set(id, chat);
            }
            return chat;
        });
    }

    async getAllChats(): Promise<ChatInfo[]> {
        return this.enqueueOperation(async () => {
            const chats = await this.chats.orderBy('updated').reverse().toArray();
            
            // Update cache with fetched chats
            chats.forEach(chat => {
                if (chat.id) {
                    this.chatCache.set(chat.id, chat);
                }
            });
            
            return chats;
        });
    }

    async updateChatTitle(id: number, title: string): Promise<void> {
        // Schedule update for batching
        const key = `chat:${id}:title`;
        this.pendingUpdates.set(key, { id, title });
        
        // Optimistically update cache
        const chat = this.chatCache.get(id);
        if (chat) {
            this.chatCache.set(id, {
                ...chat,
                title,
                updated: new Date()
            });
        }
        
        this.scheduleBatchUpdate();
    }
    
    private scheduleBatchUpdate() {
        if (this.batchTimeoutId) {
            clearTimeout(this.batchTimeoutId);
        }
        
        this.batchTimeoutId = setTimeout(() => {
            this.processBatchUpdates();
        }, 100); // 100ms batching window
    }
    
    private async processBatchUpdates() {
        if (this.pendingUpdates.size === 0) return;
        
        const updates = new Map(this.pendingUpdates);
        this.pendingUpdates.clear();
        
        // Group updates by type
        const titleUpdates: {id: number, title: string}[] = [];
        
        for (const [key, value] of updates.entries()) {
            if (key.includes(':title')) {
                titleUpdates.push(value);
            }
        }
        
        // Process title updates in a single transaction
        if (titleUpdates.length > 0) {
            await this.transaction('rw', this.chats, async () => {
                for (const update of titleUpdates) {
                    await this.chats.update(update.id, {
                        title: update.title,
                        updated: new Date()
                    });
                }
            });
        }
    }

    async deleteChat(id: number): Promise<void> {
        return this.enqueueOperation(async () => {
            await this.transaction('rw', this.chats, this.messages, async () => {
                await this.messages.where('chatId').equals(id).delete();
                await this.chats.delete(id);
            });
            
            // Remove from cache
            this.chatCache.delete(id);
            this.messageCache.delete(id);
        });
    }

    async addMessage(chatId: number, role: 'user' | 'assistant' | 'system', content: string): Promise<number> {
        return this.enqueueOperation(async () => {
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
            const messages = this.messageCache.get(chatId) || [];
            messages.push(messageInfo);
            this.messageCache.set(chatId, messages);

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
                    this.chatCache.set(chatId, updatedChat);
                }
            });

            return messageId as number;
        });
    }

    async getMessages(chatId: number): Promise<MessageInfo[]> {
        // Return from cache if available
        if (this.messageCache.has(chatId)) {
            return this.messageCache.get(chatId) || [];
        }
        
        return this.enqueueOperation(async () => {
            const messages = await this.messages
                .where('chatId')
                .equals(chatId)
                .sortBy('timestamp');
            
            // Cache the results
            this.messageCache.set(chatId, messages);
            
            return messages;
        });
    }
    
    // Memory management methods
    clearCache(): void {
        this.chatCache.clear();
        this.messageCache.clear();
    }
    
    pruneCache(maxChatEntries = 10): void {
        // Keep only the most recent chats in cache
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
}

export const db = new ChatDB();

// Export a function to cleanup resources when needed
export function cleanupDB(): void {
    db.clearCache();
}
