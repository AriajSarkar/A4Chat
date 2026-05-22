import { invoke } from "@tauri-apps/api/core";

import type {
  CompletionRequestMessage,
  CompletionResponse,
  ConversationMessage,
} from "@/components/conversation/utils/conversation";
import { normalizeProviders, type ProviderSettings } from "@/components/settings/utils/providers";

export type AppHealth = {
  platform: string;
  version: string;
  databasePath: string;
};

export function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function chatCompletionsEndpoint(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");

  if (trimmed.endsWith("/chat/completions")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);

    if (url.pathname === "" || url.pathname === "/") {
      return `${trimmed}/v1/chat/completions`;
    }
  } catch {
    // Fall back to the historical behavior when the URL parser cannot inspect the base URL.
  }

  return `${trimmed}/chat/completions`;
}

export async function getAppHealth() {
  if (!isTauriRuntime()) {
    return null;
  }

  return invoke<AppHealth>("app_health");
}

export async function loadProviders() {
  if (!isTauriRuntime()) {
    return null;
  }

  const providers = await invoke<ProviderSettings[]>("list_provider_settings");
  return normalizeProviders(providers);
}

export async function persistProviders(providers: ProviderSettings[]) {
  if (!isTauriRuntime()) {
    return;
  }

  await invoke("save_provider_settings", {
    providers: providers.map(({ id, label, baseUrl, apiKey, model, enabled }) => ({
      id,
      label,
      baseUrl,
      apiKey: apiKey || null,
      model,
      enabled,
    })),
  });
}

export async function sendChatCompletion(input: {
  provider: ProviderSettings;
  messages: CompletionRequestMessage[];
}) {
  const provider = {
    id: input.provider.id,
    label: input.provider.label,
    baseUrl: input.provider.baseUrl,
    apiKey: input.provider.apiKey || null,
    model: input.provider.model,
  };

  if (isTauriRuntime()) {
    return invoke<CompletionResponse>("send_chat_completion", {
      request: {
        provider,
        messages: input.messages,
      },
    });
  }

  const endpoint = chatCompletionsEndpoint(input.provider.baseUrl);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(input.provider.apiKey ? { authorization: `Bearer ${input.provider.apiKey}` } : {}),
      "x-title": "A4Chat",
    },
    body: JSON.stringify({
      model: input.provider.model,
      messages: input.messages,
      stream: false,
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Provider rejected the request.");
  }

  const message = payload?.choices?.[0]?.message;

  return {
    content: message?.content ?? "",
    reasoning: message?.reasoning ?? message?.reasoning_content ?? null,
    model: payload?.model ?? input.provider.model,
    inputTokens: payload?.usage?.prompt_tokens ?? payload?.usage?.input_tokens ?? null,
    outputTokens: payload?.usage?.completion_tokens ?? payload?.usage?.output_tokens ?? null,
  } satisfies CompletionResponse;
}

export async function persistConversation(
  messages: ConversationMessage[],
  provider: ProviderSettings,
  conversationId: string,
) {
  if (!isTauriRuntime() || messages.length === 0) {
    return;
  }

  await invoke("save_conversation_snapshot", {
    snapshot: {
      id: conversationId,
      title: messages[0]?.content.slice(0, 64) || "New chat",
      providerId: provider.id,
      model: provider.model,
      messages: messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        reasoning: message.reasoning ?? null,
        tokenCount: typeof message.outputTokens === "number" ? message.outputTokens : null,
      })),
    },
  });
}
