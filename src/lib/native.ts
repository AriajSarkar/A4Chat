import { invoke } from "@tauri-apps/api/core";

import {
    executeWorkflow,
    buildTextToImageWorkflow,
    listCheckpoints,
    fetchImageAsBase64,
} from "@/lib/comfyui";
import type {
    CompletionRequestMessage,
    CompletionResponse,
    ConversationMessage,
} from "@/lib/Conversation";
import { normalizeProviders, type ProviderModel, type ProviderSettings } from "@/lib/Providers";

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
    /** Fires early to signal what kind of response the API is producing */
    onResponseType?: (type: "text" | "image") => void;
};

export function isTauriRuntime() {
    return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function isAndroid() {
    return typeof window !== "undefined" && /android/i.test(navigator.userAgent);
}

export function chatCompletionsEndpoint(baseUrl: string) {
    const trimmed = baseUrl.trim().replace(/\/+$/, "");
    if (trimmed.endsWith("/chat/completions")) return trimmed;
    try {
        const url = new URL(trimmed);
        if (url.pathname === "" || url.pathname === "/") return `${trimmed}/v1/chat/completions`;
    } catch {
        /* fall through */
    }
    return `${trimmed}/chat/completions`;
}

export function modelsEndpoint(baseUrl: string) {
    const trimmed = baseUrl.trim().replace(/\/+$/, "");
    if (trimmed.endsWith("/models")) return trimmed;
    return `${trimmed}/models`;
}

type ProviderErrorOptions = {
    fallback?: string;
    providerLabel?: string;
    retryAfter?: string | null;
    status?: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRetryAfterSeconds(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return Math.max(1, Math.ceil(value));
    }

    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value.trim());
        if (Number.isFinite(parsed)) {
            return Math.max(1, Math.ceil(parsed));
        }
    }

    return null;
}

export function formatProviderError(payload: unknown, options: ProviderErrorOptions = {}) {
    const record = asRecord(payload);
    const error = asRecord(record?.error ?? payload) ?? record;
    const metadata = asRecord(error?.metadata);

    const message =
        asString(metadata?.raw) ??
        asString(error?.message) ??
        asString(record?.message) ??
        asString(typeof record?.error === "string" ? record.error : null);

    const providerName =
        asString(metadata?.provider_name) ??
        asString(error?.provider_name) ??
        asString(record?.provider_name) ??
        options.providerLabel ??
        null;

    const retryAfterSeconds =
        asRetryAfterSeconds(metadata?.retry_after_seconds_raw) ??
        asRetryAfterSeconds(metadata?.retry_after_seconds) ??
        asRetryAfterSeconds(error?.retry_after_seconds) ??
        asRetryAfterSeconds(record?.retry_after_seconds) ??
        asRetryAfterSeconds(options.retryAfter);

    const fallback =
        options.fallback ??
        (options.status ? `Provider error (HTTP ${options.status})` : "Provider request failed");
    const baseMessage = message ?? fallback;
    const providerPrefix =
        providerName && !baseMessage.toLowerCase().includes(providerName.toLowerCase())
            ? `${providerName}: `
            : "";
    const retrySuffix = retryAfterSeconds ? ` (retry after ${retryAfterSeconds}s)` : "";

    return `${providerPrefix}${baseMessage}${retrySuffix}`;
}

/* ── <think> tag parser ──────────────────────────────── */

export class ThinkTagParser {
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

export function partialTagMatch(text: string, tag: string): number {
    for (let len = Math.min(tag.length - 1, text.length); len > 0; len--) {
        if (text.endsWith(tag.slice(0, len))) return len;
    }
    return 0;
}

export function stripThinkTags(text: string): { content: string; reasoning: string } {
    let reasoning = "";
    const content = text.replace(/<think>([\s\S]*?)<\/think>/g, (_, r) => {
        reasoning += r;
        return "";
    });
    return { content: content.trim(), reasoning };
}

export function extractContentText(content: unknown): string {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content
            .filter(
                (block): block is { type: string; text: string } =>
                    typeof ==="object" &&
                    block !== null &&
                    block.type === "text" &&
                    typeof block.text === "string",
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
            id,
            label,
            baseUrl,
            apiKey: apiKey || null,
            model,
            enabled,
        })),
    });
}

/* ── Model discovery ─────────────────────────────────── */

export async function detectProviderModels(
    providerId: string,
    baseUrl: string,
    apiKey: string,
): Promise<ProviderModel[]> {
    if (isTauriRuntime()) {
        const rows = await invoke<
            Array<{
                providerId: string;
                modelId: string;
                displayName: string;
                isFavorite: boolean;
                lastSeenAt: number;
            }>
        >("detect_provider_models", {
            providerId,
            baseUrl,
            apiKey,
        });
        return rows.map((r) => ({
            modelId: r.modelId,
            displayName: r.displayName || r.modelId,
            isFavorite: r.isFavorite,
            lastSeenAt: r.lastSeenAt,
        }));
    }

    /* Browser fallback */
    let endpoint = baseUrl.replace(/\/+$/, "");
    if (!endpoint.endsWith("/models")) {
        endpoint += "/models";
    }

    if (providerId === "comfyui") {
        try {
            const checkpoints = await listCheckpoints(baseUrl);
            const now = Date.now();
            if (checkpoints.length === 0) {
                return [
                    {
                        modelId: "default-workflow",
                        displayName: "Default Text-to-Image",
                        isFavorite: false,
                        lastSeenAt: now,
                    },
                ];
            }
            return checkpoints.map((ckpt) => ({
                modelId: ckpt,
                displayName: ckpt.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "),
                isFavorite: false,
                lastSeenAt: now,
            }));
        } catch {
            throw new Error(`Could not connect to ComfyUI at ${baseUrl}. Is the server running?`);
        }
    }

    if (providerId === "google-gemini" && apiKey) {
        endpoint = endpoint.replace("/openai/models", "/models");
        endpoint += `?key=${apiKey}`;
    }

    const headers: Record<string, string> = { "content-type": "application/json" };
    if (providerId !== "google-gemini" && apiKey) {
        headers.authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(endpoint, { headers });
    if (!response.ok) {
        const rawBody = await response.text().catch(() => "");
        let payload: unknown = rawBody;
        try {
            payload = rawBody ? JSON.parse(rawBody) : {};
        } catch {
            payload = rawBody ? { error: { message: rawBody } } : {};
        }
        throw new Error(
            formatProviderError(payload, {
                fallback: `Model discovery failed (HTTP ${response.status})`,
                providerLabel: providerId,
                retryAfter: response.headers.get("retry-after"),
                status: response.status,
            }),
        );
    }

    const payload = await response.json();
    const now = Date.now();

    if (providerId === "google-gemini") {
        const models = [];
        for (const model of payload.models || []) {
            const id = model.name?.replace("models/", "") ?? "unknown";
            models.push({
                modelId: id,
                displayName: model.displayName || id,
                isFavorite: false,
                lastSeenAt: now,
            });
        }
        return models;
    }

    const data = payload?.data ?? payload ?? [];
    return (Array.isArray(data) ? data : []).map((m: { id?: string; name?: string }) => ({
        modelId: m.id ?? m.name ?? "unknown",
        displayName: m.id ?? m.name ?? "unknown",
        isFavorite: false,
        lastSeenAt: now,
    }));
}

export async function loadProviderModels(providerId: string): Promise<ProviderModel[]> {
    if (!isTauriRuntime()) return [];
    const rows = await invoke<
        Array<{
            providerId: string;
            modelId: string;
            displayName: string;
            isFavorite: boolean;
            lastSeenAt: number;
        }>
    >("list_provider_models", { providerId });
    return rows.map((r) => ({
        modelId: r.modelId,
        displayName: r.displayName || r.modelId,
        isFavorite: r.isFavorite,
        lastSeenAt: r.lastSeenAt,
    }));
}

export async function toggleModelFavorite(
    providerId: string,
    modelId: string,
    isFavorite: boolean,
): Promise<void> {
    if (!isTauriRuntime()) return;
    await invoke("toggle_model_favorite", { providerId, modelId, isFavorite });
}

export async function resolvePairingBaseUrl(baseUrl: string): Promise<string> {
    if (!isTauriRuntime()) return baseUrl;
    return invoke<string>("resolve_pairing_base_url", { baseUrl });
}

function sanitizeMessages(messages: CompletionRequestMessage[]) {
    // Strip massive base64 image strings from assistant history so we don't blow up the LLM token context window!
    return messages.map((msg) => {
        if (msg.role === "assistant" && typeof msg.content === "string") {
            const dataUriRegex = /!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/g;
            return {
                ...msg,
                content: msg.content.replace(
                    dataUriRegex,
                    "\n\n*[Generated Image omitted for context size]*",
                ),
            };
        }
        return msg;
    });
}

function buildPayload(
    provider: ProviderSettings,
    messages: CompletionRequestMessage[],
    stream: boolean,
) {
    const payload: any = {
        model: provider.model,
        messages: sanitizeMessages(messages),
        stream,
    };

    // OpenRouter context-compression plugin natively drops middle messages if context limit is exceeded
    if (provider.baseUrl.includes("openrouter.ai")) {
        payload.plugins = [{ id: "context-compression" }];
    }

    return payload;
}

/* ── Non-streaming ──────────────────────────────────── */

export async function sendChatCompletion(input: {
    provider: ProviderSettings;
    messages: CompletionRequestMessage[];
}) {
    if (input.provider.id === "google-gemini") {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: input.provider.apiKey });

        if (input.provider.model.toLowerCase().includes("imagen")) {
            const prompt = input.messages[input.messages.length - 1]?.content || "A picture";
            const response = await ai.models.generateImages({
                model: input.provider.model,
                prompt: typeof prompt === "string" ? prompt : "A picture",
                config: { numberOfImages: 1, outputMimeType: "image/jpeg" },
            });
            const base64 = response.generatedImages?.[0]?.image?.imageBytes;
            if (!base64) throw new Error("No image generated");
            return {
                content: `\n\n![Generated Image](data:image/jpeg;base64,${base64})`,
                reasoning: null,
                model: input.provider.model,
                inputTokens: null,
                outputTokens: null,
            };
        }

        const sanitized = sanitizeMessages(input.messages);
        const systemMessage = sanitized.find((m) => (m.role as string) === "system");
        const chatMessages = sanitized.filter((m) => (m.role as string) !== "system");

        const geminiContents: { role: string; parts: { text: string }[] }[] = [];
        for (const m of chatMessages) {
            const role = m.role === "assistant" ? "model" : "user";
            const text = typeof m.content === "string" ? m.content : "";
            if (
                geminiContents.length > 0 &&
                geminiContents[geminiContents.length - 1].role === role
            ) {
                geminiContents[geminiContents.length - 1].parts[0].text += "\n\n" + text;
            } else {
                geminiContents.push({ role, parts: [{ text }] });
            }
        }

        const response = await ai.models.generateContent({
            model: input.provider.model,
            contents: geminiContents,
            config: {
                systemInstruction:
                    systemMessage && typeof systemMessage.content === "string"
                        ? systemMessage.content
                        : undefined,
            },
        });

        return {
            content: response.text || "",
            reasoning: null,
            model: input.provider.model,
            inputTokens: response.usageMetadata?.promptTokenCount ?? null,
            outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
        };
    }

    /* ── ComfyUI — workflow-based image generation ────── */
    if (input.provider.id === "comfyui") {
        const lastMsg = input.messages[input.messages.length - 1];
        const prompt =
            typeof lastMsg?.content === "string" ? lastMsg.content : "A beautiful landscape";
        const checkpoint = input.provider.model || "";

        if (!checkpoint || checkpoint === "default-workflow") {
            throw new Error(
                "No checkpoint model selected. Go to Settings → ComfyUI and pick a checkpoint, or let model discovery detect your installed checkpoints.",
            );
        }

        const workflow = buildTextToImageWorkflow(prompt, checkpoint);

        try {
            const images = await executeWorkflow(input.provider.baseUrl, workflow, {});

            if (images.length === 0) throw new Error("No images generated");

            const base64 = await fetchImageAsBase64(input.provider.baseUrl, images[0]);
            return {
                content: `\n\n![Generated Image](${base64})`,
                reasoning: null,
                model: checkpoint,
                inputTokens: null,
                outputTokens: null,
            };
        } catch (err) {
            throw err instanceof Error ? err : new Error(String(err));
        }
    }

    if (isTauriRuntime()) {
        return invoke<CompletionResponse>("send_chat_completion", {
            request: {
                provider: {
                    id: input.provider.id,
                    label: input.provider.label,
                    baseUrl: input.provider.baseUrl,
                    apiKey: input.provider.apiKey || null,
                    model: input.provider.model,
                },
                messages: sanitizeMessages(input.messages),
            },
        });
    }

    const endpoint = chatCompletionsEndpoint(input.provider.baseUrl);
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            ...(input.provider.apiKey ? { authorization: `Bearer ${input.provider.apiKey}` } : {}),
            ...(input.provider.baseUrl.includes("openrouter.ai") ? { "x-title": "A4Chat" } : {}),
        },
        body: JSON.stringify(buildPayload(input.provider, input.messages, false)),
    });
    if (!response.ok) {
        const rawBody = await response.text().catch(() => "");
        let payload: unknown = rawBody;
        try {
            payload = rawBody ? JSON.parse(rawBody) : {};
        } catch {
            payload = rawBody ? { error: { message: rawBody } } : {};
        }
        throw new Error(
            formatProviderError(payload, {
                fallback: "Provider rejected the request.",
                providerLabel: input.provider.label,
                retryAfter: response.headers.get("retry-after"),
                status: response.status,
            }),
        );
    }

    const payload = await response.json();
    const message = payload?.choices?.[0]?.message;

    const rawContent = extractContentText(message?.content);
    const rawReasoning = message?.reasoning ?? message?.reasoning_content ?? "";
    const parsed = stripThinkTags(rawContent);

    const msgImages = message?.images as Array<{ image_url?: { url: string } }> | undefined;
    let finalContent = parsed.content;

    if (msgImages && msgImages.length > 0) {
        for (const img of msgImages) {
            if (img.image_url?.url) {
                finalContent += `\n\n![Generated Image](${img.image_url.url})`;
            }
        }
    }

    return {
        content: finalContent,
        reasoning: rawReasoning + parsed.reasoning || null,
        model: payload?.model ?? input.provider.model,
        inputTokens: payload?.usage?.prompt_tokens ?? payload?.usage?.input_tokens ?? null,
        outputTokens: payload?.usage?.completion_tokens ?? payload?.usage?.output_tokens ?? null,
    } satisfies CompletionResponse;
}

/* ── SSE Streaming ──────────────────────────────────── */

export async function streamChatCompletion(
    input: {
        provider: ProviderSettings;
        messages: CompletionRequestMessage[];
        signal?: AbortSignal;
    },
    callbacks: StreamCallbacks,
) {
    /* ── ComfyUI — workflow-based image generation with progress ─── */
    if (input.provider.id === "comfyui") {
        callbacks.onResponseType?.("image");

        const lastMsg = input.messages[input.messages.length - 1];
        const prompt =
            typeof lastMsg?.content === "string" ? lastMsg.content : "A beautiful landscape";
        const checkpoint = input.provider.model || "";

        if (!checkpoint || checkpoint === "default-workflow") {
            callbacks.onError(
                new Error(
                    "No checkpoint model selected. Go to Settings → ComfyUI and pick a checkpoint.",
                ),
            );
            return;
        }

        const workflow = buildTextToImageWorkflow(prompt, checkpoint);

        try {
            const images = await executeWorkflow(
                input.provider.baseUrl,
                workflow,
                {
                    onProgress: (value, max) => {
                        const pct = Math.round((value / max) * 100);
                        callbacks.onToken(`\n\n_Generating… ${pct}%_`);
                    },
                },
                input.signal,
            );

            if (images.length === 0) {
                callbacks.onError(new Error("No images generated"));
                return;
            }

            const base64 = await fetchImageAsBase64(input.provider.baseUrl, images[0]);
            const tag = `\n\n![Generated Image](${base64})`;
            callbacks.onToken(tag);
            callbacks.onComplete({
                content: tag,
                reasoning: null,
                model: checkpoint,
                inputTokens: null,
                outputTokens: null,
            });
        } catch (err) {
            if ((err as Error).message === "Aborted") return;
            callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        }
        return;
    }

    if (input.provider.id === "google-gemini") {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: input.provider.apiKey });

        if (input.provider.model.toLowerCase().includes("imagen")) {
            callbacks.onResponseType?.("image");
            const prompt = input.messages[input.messages.length - 1]?.content || "A picture";
            try {
                const response = await ai.models.generateImages({
                    model: input.provider.model,
                    prompt: typeof prompt === "string" ? prompt : "A picture",
                    config: { numberOfImages: 1, outputMimeType: "image/jpeg" },
                });
                const base64 = response.generatedImages?.[0]?.image?.imageBytes;
                if (!base64) throw new Error("No image generated");
                const tag = `\n\n![Generated Image](data:image/jpeg;base64,${base64})`;
                callbacks.onToken(tag);
                callbacks.onComplete({
                    content: tag,
                    reasoning: null,
                    model: input.provider.model,
                    inputTokens: null,
                    outputTokens: null,
                });
            } catch (e) {
                callbacks.onError(e instanceof Error ? e : new Error(String(e)));
            }
            return;
        }

        try {
            callbacks.onResponseType?.("text");
            const sanitized = sanitizeMessages(input.messages);
            const systemMessage = sanitized.find((m) => (m.role as string) === "system");
            const chatMessages = sanitized.filter((m) => (m.role as string) !== "system");

            const geminiContents: { role: string; parts: { text: string }[] }[] = [];
            for (const m of chatMessages) {
                const role = m.role === "assistant" ? "model" : "user";
                const text = typeof m.content === "string" ? m.content : "";
                if (
                    geminiContents.length > 0 &&
                    geminiContents[geminiContents.length - 1].role === role
                ) {
                    geminiContents[geminiContents.length - 1].parts[0].text += "\n\n" + text;
                } else {
                    geminiContents.push({ role, parts: [{ text }] });
                }
            }

            const responseStream = await ai.models.generateContentStream({
                model: input.provider.model,
                contents: geminiContents,
                config: {
                    systemInstruction:
                        systemMessage && typeof systemMessage.content === "string"
                            ? systemMessage.content
                            : undefined,
                },
            });

            let fullContent = "";
            for await (const chunk of responseStream) {
                if (input.signal?.aborted) return;
                const text = chunk.text;
                if (text) {
                    fullContent += text;
                    callbacks.onToken(text);
                }
            }
            callbacks.onComplete({
                content: fullContent,
                reasoning: null,
                model: input.provider.model,
                inputTokens: null,
                outputTokens: null,
            });
        } catch (e) {
            callbacks.onError(e instanceof Error ? e : new Error(String(e)));
        }
        return;
    }

    const endpoint = chatCompletionsEndpoint(input.provider.baseUrl);

    let response: Response;
    try {
        response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                ...(input.provider.apiKey
                    ? { authorization: `Bearer ${input.provider.apiKey}` }
                    : {}),
                ...(input.provider.baseUrl.includes("openrouter.ai")
                    ? { "x-title": "A4Chat" }
                    : {}),
            },
            body: JSON.stringify(buildPayload(input.provider, input.messages, true)),
            signal: input.signal,
        });
    } catch (err) {
        if ((err as Error).name === "AbortError") return;
        callbacks.onError(err instanceof Error ? err : new Error("Network error"));
        return;
    }

    if (!response.ok) {
        const rawBody = await response.text().catch(() => "");
        let payload: unknown = rawBody;
        try {
            payload = rawBody ? JSON.parse(rawBody) : {};
        } catch {
            payload = rawBody ? { error: { message: rawBody } } : {};
        }
        callbacks.onError(
            new Error(
                formatProviderError(payload, {
                    fallback: "Provider rejected the request.",
                    providerLabel: input.provider.label,
                    retryAfter: response.headers.get("retry-after"),
                    status: response.status,
                }),
            ),
        );
        return;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
        const payload = await response.json();
        const msg = payload?.choices?.[0]?.message;
        const rawContent = extractContentText(msg?.content);
        const rawReasoning = msg?.reasoning ?? msg?.reasoning_content ?? "";
        const parsed = stripThinkTags(rawContent);
        const finalReasoning = rawReasoning + parsed.reasoning || null;
        if (finalReasoning) callbacks.onReasoning(finalReasoning);
        if (parsed.content) callbacks.onToken(parsed.content);
        const msgImages = msg?.images as Array<{ image_url?: { url: string } }> | undefined;
        const hasImages = msgImages && msgImages.length > 0;
        callbacks.onResponseType?.(hasImages && !parsed.content ? "image" : "text");
        let finalContent = parsed.content;

        if (hasImages) {
            for (const img of msgImages) {
                if (img.image_url?.url) {
                    const imgTag = `\n\n![Generated Image](${img.image_url.url})`;
                    finalContent += imgTag;
                    callbacks.onToken(imgTag);
                }
            }
        }

        callbacks.onComplete({
            content: finalContent,
            reasoning: finalReasoning,
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
    let responseTypeSignaled = false;

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

                    /* Handle inline SSE errors (provider sends error in stream data) */
                    if (chunk.error) {
                        callbacks.onError(
                            new Error(
                                formatProviderError(chunk.error, {
                                    fallback: "Provider returned error",
                                    providerLabel: input.provider.label,
                                }),
                            ),
                        );
                        return;
                    }

                    const delta = chunk.choices?.[0]?.delta;
                    if (!delta) {
                        if (chunk.usage) {
                            inputTokens =
                                chunk.usage.prompt_tokens ?? chunk.usage.input_tokens ?? null;
                            outputTokens =
                                chunk.usage.completion_tokens ?? chunk.usage.output_tokens ?? null;
                        }
                        continue;
                    }

                    const rawDelta = extractContentText(delta.content);
                    if (rawDelta) {
                        const { content, reasoning } = thinkParser.process(rawDelta);
                        if (content) {
                            if (!responseTypeSignaled) {
                                responseTypeSignaled = true;
                                callbacks.onResponseType?.("text");
                            }
                            fullContent += content;
                            callbacks.onToken(content);
                        }
                        if (reasoning) {
                            fullReasoning += reasoning;
                            callbacks.onReasoning(reasoning);
                        }
                    }

                    const deltaImages = delta.images as
                        | Array<{ image_url?: { url: string } }>
                        | undefined;
                    if (deltaImages && deltaImages.length > 0) {
                        if (!responseTypeSignaled) {
                            responseTypeSignaled = true;
                            callbacks.onResponseType?.("image");
                        }
                        for (const img of deltaImages) {
                            if (img.image_url?.url) {
                                const imgTag = `\n\n![Generated Image](${img.image_url.url})`;
                                fullContent += imgTag;
                                callbacks.onToken(imgTag);
                            }
                        }
                    }

                    const reasoningDelta = delta.reasoning ?? delta.reasoning_content;
                    if (reasoningDelta) {
                        fullReasoning += reasoningDelta;
                        callbacks.onReasoning(reasoningDelta);
                    }
                    if (chunk.model) model = chunk.model;
                    if (chunk.usage) {
                        inputTokens = chunk.usage.prompt_tokens ?? chunk.usage.input_tokens ?? null;
                        outputTokens =
                            chunk.usage.completion_tokens ?? chunk.usage.output_tokens ?? null;
                    }
                } catch {
                    /* partial JSON, skip */
                }
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
    if (remaining.content) {
        fullContent += remaining.content;
        callbacks.onToken(remaining.content);
    }
    if (remaining.reasoning) {
        fullReasoning += remaining.reasoning;
        callbacks.onReasoning(remaining.reasoning);
    }

    callbacks.onComplete({
        content: fullContent,
        reasoning: fullReasoning || null,
        model,
        inputTokens,
        outputTokens,
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
                    id: m.id,
                    role: m.role,
                    content: m.content,
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
                    id: m.id,
                    role: m.role,
                    content: m.content,
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

export async function loadConversationMessages(
    conversationId: string,
): Promise<ConversationMessage[]> {
    if (isTauriRuntime()) {
        const msgs = await invoke<
            Array<{
                id: string;
                role: string;
                content: string;
                reasoning: string | null;
                tokenCount: number | null;
            }>
        >("load_conversation_messages", { conversationId });
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
    return msgs.map(
        (m: {
            id: string;
            role: string;
            content: string;
            reasoning?: string;
            outputTokens?: number;
            createdAt: number;
        }) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            reasoning: m.reasoning ?? undefined,
            outputTokens: m.outputTokens ?? undefined,
            createdAt: m.createdAt,
        }),
    );
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
