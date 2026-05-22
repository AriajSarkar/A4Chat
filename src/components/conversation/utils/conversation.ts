import type { ProviderSettings } from "@/components/settings/utils/providers";

export type ConversationRole = "user" | "assistant";

export type ConversationMessage = {
  id: string;
  role: ConversationRole;
  content: string;
  createdAt: number;
  reasoning?: string;
  providerId?: string;
  providerLabel?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
};

export type CompletionResponse = {
  content: string;
  reasoning?: string | null;
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
};

export type CompletionRequestMessage = {
  role: ConversationRole;
  content: string;
};

export function createUserMessage(content: string): ConversationMessage {
  return {
    id: crypto.randomUUID(),
    role: "user",
    content,
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
    .filter((message) => message.content.trim().length > 0)
    .map<CompletionRequestMessage>((message) => ({
      role: message.role,
      content: message.content,
    }));
}
