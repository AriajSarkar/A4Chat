export interface ChatInfo {
    id?: number;
    title: string;
    model: string;
    created: Date;
    updated: Date;
    messageCount: number;
}

export interface MessageInfo {
    id?: number;
    chatId: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}
