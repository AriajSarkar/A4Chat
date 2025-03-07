import Dexie, { Table } from 'dexie';
import { ChatInfo, MessageInfo } from './models';

class ChatDB extends Dexie {
    chats!: Table<ChatInfo, number>;
    messages!: Table<MessageInfo, number>;

    constructor() {
        super('A4ChatDatabase');
        
        this.version(1).stores({
            chats: '++id, title, model, created, updated',
            messages: '++id, chatId, role, timestamp'
        });
    }

    async createChat(title: string, model: string): Promise<number> {
        const now = new Date();
        return await this.chats.add({
            title,
            model,
            created: now,
            updated: now,
            messageCount: 0
        });
    }

    async getChat(id: number): Promise<ChatInfo | undefined> {
        return await this.chats.get(id);
    }

    async getAllChats(): Promise<ChatInfo[]> {
        return await this.chats.orderBy('updated').reverse().toArray();
    }

    async updateChatTitle(id: number, title: string): Promise<void> {
        await this.chats.update(id, {
            title,
            updated: new Date()
        });
    }

    async deleteChat(id: number): Promise<void> {
        await this.transaction('rw', this.chats, this.messages, async () => {
            await this.messages.where('chatId').equals(id).delete();
            await this.chats.delete(id);
        });
    }

    async addMessage(chatId: number, role: 'user' | 'assistant' | 'system', content: string): Promise<number> {
        const messageId = await this.messages.add({
            chatId,
            role,
            content,
            timestamp: new Date()
        });

        // Update the chat's updated timestamp and message count
        await this.transaction('rw', this.chats, async () => {
            const chat = await this.chats.get(chatId);
            if (chat) {
                await this.chats.update(chatId, {
                    updated: new Date(),
                    messageCount: chat.messageCount + 1,
                    // Update title based on first user message if it's generic
                    title: chat.title === 'New Conversation' && role === 'user' 
                        ? content.substring(0, 30) + (content.length > 30 ? '...' : '')
                        : chat.title
                });
            }
        });

        return messageId;
    }

    async getMessages(chatId: number): Promise<MessageInfo[]> {
        return await this.messages
            .where('chatId')
            .equals(chatId)
            .sortBy('timestamp');
    }
}

export const db = new ChatDB();
