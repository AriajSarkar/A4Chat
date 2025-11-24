import { z } from "zod";

// --- Models ---

export const ModelInfoSchema = z.object({
    id: z.string(),
    name: z.string(),
    provider: z.string(), // "ollama" | "openrouter"
    contextLen: z.number().optional(),
    isFavorite: z.boolean().default(false),
});

export type ModelInfo = z.infer<typeof ModelInfoSchema>;

// --- Messages ---

export const RoleSchema = z.enum(["user", "assistant", "system"]);
export type Role = z.infer<typeof RoleSchema>;

export const MessageSchema = z.object({
    id: z.string().uuid(),
    conversationId: z.string().uuid(),
    role: RoleSchema,
    content: z.string(),
    model: z.string().optional(),
    provider: z.string().optional(),
    tokens: z.number().optional(),
    createdAt: z.date().or(z.string()), // String when coming from JSON/DB
});

export type Message = z.infer<typeof MessageSchema>;

// --- Conversations ---

export const ConversationSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    seasonId: z.string(),
    createdAt: z.date().or(z.string()),
    updatedAt: z.date().or(z.string()),
    messages: z.array(MessageSchema).optional(),
});

export type Conversation = z.infer<typeof ConversationSchema>;

// --- Streaming ---

export const StreamChunkSchema = z.object({
    streamId: z.string(),
    token: z.string(),
    done: z.boolean(),
    meta: z.record(z.string(), z.unknown()).optional(),
});

export type StreamChunk = z.infer<typeof StreamChunkSchema>;

// --- API Payloads ---

export const LlmGenerateRequestSchema = z.object({
    provider: z.string(),
    model: z.string(),
    prompt: z.string(),
    conversationId: z.string().uuid(),
    options: z.record(z.string(), z.unknown()).optional(),
});

export type LlmGenerateRequest = z.infer<typeof LlmGenerateRequestSchema>;
