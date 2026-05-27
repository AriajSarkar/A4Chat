import type { ProviderSettings } from "@/lib/Providers";

export type ConversationRole = "user" | "assistant";

export type ResponseType = "pending" | "text" | "image";

export type ConversationMessage = {
    id: string;
    role: ConversationRole;
    content: string;
    images?: string[]; // Array of base64 data URLs
    createdAt: number;
    reasoning?: string;
    providerId?: string;
    providerLabel?: string;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    /** Detected during streaming — what kind of content the API is sending back */
    responseType?: ResponseType;
};

export type CompletionResponse = {
    content: string;
    reasoning?: string | null;
    model?: string | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
};

export type CompletionRequestMessageContentPart =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } };

export type CompletionRequestMessage = {
    role: ConversationRole;
    content: string | CompletionRequestMessageContentPart[];
};

export function createUserMessage(content: string, images?: string[]): ConversationMessage {
    return {
        id: crypto.randomUUID(),
        role: "user",
        content,
        images: images && images.length > 0 ? images : undefined,
        createdAt: Date.now(),
    };
}

export function createAssistantMessage(
    response: CompletionResponse,
    provider: ProviderSettings,
): ConversationMessage {
    return {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.content,
        createdAt: Date.now(),
        reasoning: response.reasoning ?? undefined,
        providerId: provider.id,
        providerLabel: provider.label,
        model: response.model ?? provider.model,
        inputTokens: response.inputTokens ?? undefined,
        outputTokens: response.outputTokens ?? undefined,
    };
}

export function toCompletionMessages(messages: ConversationMessage[]) {
    return messages
        .filter(
            (message) =>
                message.content.trim().length > 0 || (message.images && message.images.length > 0),
        )
        .map<CompletionRequestMessage>((message) => {
            if (message.images && message.images.length > 0) {
                const contentParts: CompletionRequestMessageContentPart[] = [];
                if (message.content.trim()) {
                    contentParts.push({ type: "text", text: message.content });
                }
                for (const img of message.images) {
                    contentParts.push({ type: "image_url", image_url: { url: img } });
                }
                return {
                    role: message.role,
                    content: contentParts,
                };
            }

            return {
                role: message.role,
                content: message.content,
            };
        });
}
