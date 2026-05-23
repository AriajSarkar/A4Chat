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

export type SavedConversation = {
  id: string;
  title: string;
  updatedAt: number;
  providerId: string;
  model: string;
};

export type StreamCallbacks = {
  onToken: (token: string) => void;
  onReasoning: (token: string) => void;
  onComplete: (response: CompletionResponse) => void;
  onError: (error: Error) => void;
};

export function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function chatCompletionsEndpoint(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.pathname === "" || url.pathname === "/") return `${trimmed}/v1/chat/completions`;
  } catch { /* fall through */ }
  return `${trimmed}/chat/completions`;
}

/* ── <think> tag parser ──────────────────────────────── */

class ThinkTagParser {
  private inThink = false;
  private pending = "";

  process(raw: string): { content: string; reasoning: string } {
    let remaining = this.pending + raw;
    this.pending = "";
    let content = "";
    let reasoning = "";

    while (remaining.length > 0) {
      if (this.inThink) {
        const closeIdx = remaining.indexOf("</think>");
        if (closeIdx !== -1) {
          reasoning += remaining.slice(0, closeIdx);
          remaining = remaining.slice(closeIdx + 8);
          this.inThink = false;
        } else {
          const partial = partialTagMatch(remaining, "</think>");
          if (partial > 0) {
            reasoning += remaining.slice(0, -partial);
            this.pending = remaining.slice(-partial);
          } else {
            reasoning += remaining;
          }
          remaining = "";
        }
      } else {
        const openIdx = remaining.indexOf("<think>");
        if (openIdx !== -1) {
          content += remaining.slice(0, openIdx);
          remaining = remaining.slice(openIdx + 7);
          this.inThink = true;
        } else {
          const partial = partialTagMatch(remaining, "<think>");
          if (partial > 0) {
            content += remaining.slice(0, -partial);
            this.pending = remaining.slice(-partial);
          } else {
            content += remaining;
          }
          remaining = "";
        }
      }
    }

    return { content, reasoning };
  }

  flush(): { content: string; reasoning: string } {
    const leftover = this.pending;
    this.pending = "";
    if (this.inThink) return { content: "", reasoning: leftover };
    return { content: leftover, reasoning: "" };
  }
}

function partialTagMatch(text: string, tag: string): number {
  for (let len = Math.min(tag.length - 1, text.length); len > 0; len--) {
    if (text.endsWith(tag.slice(0, len))) return len;
  }
  return 0;
}

function stripThinkTags(text: string): { content: string; reasoning: string } {
  let reasoning = "";
  const content = text.replace(/<think>([\s\S]*?)<\/think>/g, (_, r) => {
    reasoning += r;
    return "";
  });
  return { content: content.trim(), reasoning };
}

function extractContentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((block): block is { type: string; text: string } =>
        typeof block === "object" && block !== null && block.type === "text" && typeof block.text === "string",
      )
      .map((block) => block.text)
      .join("");
  }
  return "";
}

/* ── Exports ──────────────────────────────────────────── */

export async function getAppHealth() {
  if (!isTauriRuntime()) return null;
  return invoke<AppHealth>("app_health");
}

export async function loadProviders() {
  if (!isTauriRuntime()) return null;
  const providers = await invoke<ProviderSettings[]>("list_provider_settings");
  return normalizeProviders(providers);
}

export async function persistProviders(providers: ProviderSettings[]) {
  if (!isTauriRuntime()) return;
  await invoke("save_provider_settings", {
    providers: providers.map(({ id, label, baseUrl, apiKey, model, enabled }) => ({
      id, label, baseUrl, apiKey: apiKey || null, model, enabled,
    })),
  });
}

/* ── Non-streaming ──────────────────────────────────── */

export async function sendChatCompletion(input: {
  provider: ProviderSettings;
  messages: CompletionRequestMessage[];
}) {
  if (isTauriRuntime()) {
    return invoke<CompletionResponse>("send_chat_completion", {
      request: {
        provider: {
          id: input.provider.id, label: input.provider.label,
          baseUrl: input.provider.baseUrl, apiKey: input.provider.apiKey || null,
          model: input.provider.model,
        },
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
    body: JSON.stringify({ model: input.provider.model, messages: input.messages, stream: false }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message ?? "Provider rejected the request.");
  const message = payload?.choices?.[0]?.message;

  const rawContent = extractContentText(message?.content);
  const rawReasoning = message?.reasoning ?? message?.reasoning_content ?? "";
  const parsed = stripThinkTags(rawContent);

  return {
    content: parsed.content,
    reasoning: (rawReasoning + parsed.reasoning) || null,
    model: payload?.model ?? input.provider.model,
    inputTokens: payload?.usage?.prompt_tokens ?? payload?.usage?.input_tokens ?? null,
    outputTokens: payload?.usage?.completion_tokens ?? payload?.usage?.output_tokens ?? null,
  } satisfies CompletionResponse;
}

/* ── SSE Streaming ──────────────────────────────────── */

export async function streamChatCompletion(
  input: { provider: ProviderSettings; messages: CompletionRequestMessage[]; signal?: AbortSignal },
  callbacks: StreamCallbacks,
) {
  const endpoint = chatCompletionsEndpoint(input.provider.baseUrl);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(input.provider.apiKey ? { authorization: `Bearer ${input.provider.apiKey}` } : {}),
        "x-title": "A4Chat",
      },
      body: JSON.stringify({ model: input.provider.model, messages: input.messages, stream: true }),
      signal: input.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    callbacks.onError(err instanceof Error ? err : new Error("Network error"));
    return;
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    callbacks.onError(new Error(payload?.error?.message ?? `Provider error: ${response.status}`));
    return;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = await response.json();
    const msg = payload?.choices?.[0]?.message;
    const rawContent = extractContentText(msg?.content);
    const rawReasoning = msg?.reasoning ?? msg?.reasoning_content ?? "";
    const parsed = stripThinkTags(rawContent);
    const finalReasoning = (rawReasoning + parsed.reasoning) || null;
    if (finalReasoning) callbacks.onReasoning(finalReasoning);
    if (parsed.content) callbacks.onToken(parsed.content);
    callbacks.onComplete({
      content: parsed.content, reasoning: finalReasoning,
      model: payload?.model ?? input.provider.model,
      inputTokens: payload?.usage?.prompt_tokens ?? null,
      outputTokens: payload?.usage?.completion_tokens ?? null,
    });
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const thinkParser = new ThinkTagParser();
  let buffer = "";
  let fullContent = "";
  let fullReasoning = "";
  let model = input.provider.model;
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") continue;

        try {
          const chunk = JSON.parse(data);
          const delta = chunk.choices?.[0]?.delta;
          if (!delta) {
            if (chunk.usage) {
              inputTokens = chunk.usage.prompt_tokens ?? chunk.usage.input_tokens ?? null;
              outputTokens = chunk.usage.completion_tokens ?? chunk.usage.output_tokens ?? null;
            }
            continue;
          }

          const rawDelta = extractContentText(delta.content);
          if (rawDelta) {
            const { content, reasoning } = thinkParser.process(rawDelta);
            if (content) { fullContent += content; callbacks.onToken(content); }
            if (reasoning) { fullReasoning += reasoning; callbacks.onReasoning(reasoning); }
          }

          const reasoningDelta = delta.reasoning ?? delta.reasoning_content;
          if (reasoningDelta) { fullReasoning += reasoningDelta; callbacks.onReasoning(reasoningDelta); }
          if (chunk.model) model = chunk.model;
          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens ?? chunk.usage.input_tokens ?? null;
            outputTokens = chunk.usage.completion_tokens ?? chunk.usage.output_tokens ?? null;
          }
        } catch { /* partial JSON, skip */ }
      }
    }
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    callbacks.onError(err instanceof Error ? err : new Error("Stream interrupted"));
    return;
  } finally {
    reader.releaseLock();
  }

  const remaining = thinkParser.flush();
  if (remaining.content) { fullContent += remaining.content; callbacks.onToken(remaining.content); }
  if (remaining.reasoning) { fullReasoning += remaining.reasoning; callbacks.onReasoning(remaining.reasoning); }

  callbacks.onComplete({
    content: fullContent, reasoning: fullReasoning || null,
    model, inputTokens, outputTokens,
  });
}

/* ── Conversation persistence ─────────────────────────────
 * Tauri  → Rust SQLite via invoke()
 * Dev    → Prisma SQLite via Next.js API routes
 * ──────────────────────────────────────────────────────── */

export async function persistConversation(
  messages: ConversationMessage[],
  provider: ProviderSettings,
  conversationId: string,
) {
  if (messages.length === 0) return;
  const title = messages[0]?.content.slice(0, 64) || "New chat";

  if (isTauriRuntime()) {
    await invoke("save_conversation_snapshot", {
      snapshot: {
        id: conversationId,
        title,
        providerId: provider.id,
        model: provider.model,
        messages: messages.map((m) => ({
          id: m.id, role: m.role, content: m.content,
          reasoning: m.reasoning ?? null,
          tokenCount: typeof m.outputTokens === "number" ? m.outputTokens : null,
        })),
      },
    });
  } else {
    await fetch("/api/conversations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: conversationId,
        title,
        providerId: provider.id,
        model: provider.model,
        messages: messages.map((m) => ({
          id: m.id, role: m.role, content: m.content,
          reasoning: m.reasoning ?? null,
          tokenCount: typeof m.outputTokens === "number" ? m.outputTokens : null,
        })),
      }),
    });
  }
}

export async function loadConversationList(): Promise<SavedConversation[]> {
  if (isTauriRuntime()) {
    return invoke<SavedConversation[]>("list_conversations");
  }
  const res = await fetch("/api/conversations");
  return res.json();
}

export async function loadConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
  if (isTauriRuntime()) {
    const msgs = await invoke<Array<{
      id: string; role: string; content: string;
      reasoning: string | null; tokenCount: number | null;
    }>>("load_conversation_messages", { conversationId });
    return msgs.map((m, i) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      reasoning: m.reasoning ?? undefined,
      outputTokens: m.tokenCount ?? undefined,
      createdAt: Date.now() - (msgs.length - i) * 1000,
    }));
  }
  const res = await fetch(`/api/conversations/${conversationId}`);
  const msgs = await res.json();
  return msgs.map((m: { id: string; role: string; content: string; reasoning?: string; outputTokens?: number; createdAt: number }) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    reasoning: m.reasoning ?? undefined,
    outputTokens: m.outputTokens ?? undefined,
    createdAt: m.createdAt,
  }));
}

export async function deleteConversation(conversationId: string) {
  if (isTauriRuntime()) {
    await invoke("delete_conversation", { conversationId });
  } else {
    await fetch(`/api/conversations/${conversationId}`, { method: "DELETE" });
  }
}

export async function bulkDeleteConversations(ids: string[]) {
  if (isTauriRuntime()) {
    for (const id of ids) {
      await invoke("delete_conversation", { conversationId: id });
    }
  } else {
    await fetch("/api/conversations", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids }),
    });
  }
}

export async function renameConversation(conversationId: string, newTitle: string) {
  if (isTauriRuntime()) {
    await invoke("rename_conversation", { conversationId, newTitle });
  } else {
    await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
  }
}
