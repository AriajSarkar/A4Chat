import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
    createUserMessage,
    createAssistantMessage,
    toCompletionMessages,
    type ConversationMessage,
    type CompletionResponse,
} from "@/lib/Conversation";
import type { ProviderSettings } from "@/lib/Providers";

// ── Fixtures ────────────────────────────────────────────────────

const MOCK_PROVIDER: ProviderSettings = {
    id: "test-provider",
    label: "Test Provider",
    baseUrl: "http://localhost:1234/v1",
    apiKey: "",
    model: "test-model",
    enabled: true,
};

function makeMsg(
    overrides: Partial<ConversationMessage> & { content: string; role: "user" | "assistant" },
): ConversationMessage {
    return {
        id: overrides.id ?? crypto.randomUUID(),
        createdAt: overrides.createdAt ?? Date.now(),
        ...overrides,
    };
}

// ── createUserMessage ───────────────────────────────────────────

describe("createUserMessage", () => {
    it("creates a message with role 'user'", () => {
        const msg = createUserMessage("Hello AI");
        expect(msg.role).toBe("user");
        expect(msg.content).toBe("Hello AI");
    });

    it("generates a unique id each time", () => {
        const a = createUserMessage("test");
        const b = createUserMessage("test");
        expect(a.id).not.toBe(b.id);
    });

    it("generates valid UUID format", () => {
        const msg = createUserMessage("test");
        expect(msg.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it("includes a createdAt timestamp close to now", () => {
        const before = Date.now();
        const msg = createUserMessage("test");
        const after = Date.now();
        expect(msg.createdAt).toBeGreaterThanOrEqual(before);
        expect(msg.createdAt).toBeLessThanOrEqual(after);
    });

    it("has no optional fields set", () => {
        const msg = createUserMessage("test");
        expect(msg.reasoning).toBeUndefined();
        expect(msg.providerId).toBeUndefined();
        expect(msg.providerLabel).toBeUndefined();
        expect(msg.model).toBeUndefined();
        expect(msg.inputTokens).toBeUndefined();
        expect(msg.outputTokens).toBeUndefined();
        expect(msg.responseType).toBeUndefined();
    });

    // ── Content edge cases ──────────────────────────────────────

    it("handles empty string content", () => {
        const msg = createUserMessage("");
        expect(msg.content).toBe("");
    });

    it("handles very long content (10k chars)", () => {
        const long = "x".repeat(10_000);
        const msg = createUserMessage(long);
        expect(msg.content.length).toBe(10_000);
    });

    it("handles content with special characters", () => {
        const special = '<script>alert("xss")</script>';
        const msg = createUserMessage(special);
        expect(msg.content).toBe(special);
    });

    it("handles content with unicode/emoji", () => {
        const emoji = "Hello 🌍! こんにちは 你好";
        const msg = createUserMessage(emoji);
        expect(msg.content).toBe(emoji);
    });

    it("handles content with newlines", () => {
        const multiline = "line1\nline2\nline3";
        const msg = createUserMessage(multiline);
        expect(msg.content).toBe(multiline);
    });

    // ── Images edge cases ───────────────────────────────────────

    it("sets images to undefined when not provided", () => {
        const msg = createUserMessage("test");
        expect(msg.images).toBeUndefined();
    });

    it("sets images to undefined when undefined is passed", () => {
        const msg = createUserMessage("test", undefined);
        expect(msg.images).toBeUndefined();
    });

    it("sets images to undefined when empty array is passed", () => {
        const msg = createUserMessage("test", []);
        expect(msg.images).toBeUndefined();
    });

    it("sets images when non-empty array is passed", () => {
        const imgs = ["data:image/png;base64,abc123"];
        const msg = createUserMessage("test", imgs);
        expect(msg.images).toEqual(imgs);
    });

    it("preserves multiple images", () => {
        const imgs = [
            "data:image/png;base64,img1",
            "data:image/jpeg;base64,img2",
            "data:image/webp;base64,img3",
        ];
        const msg = createUserMessage("test", imgs);
        expect(msg.images).toHaveLength(3);
        expect(msg.images).toEqual(imgs);
    });

    // ── Property-based ──────────────────────────────────────────

    it("property: content is preserved exactly", () => {
        fc.assert(
            fc.property(fc.string(), (content) => {
                const msg = createUserMessage(content);
                expect(msg.content).toBe(content);
                expect(msg.role).toBe("user");
            }),
        );
    });

    it("property: every call produces a unique id", () => {
        fc.assert(
            fc.property(fc.string(), (content) => {
                const a = createUserMessage(content);
                const b = createUserMessage(content);
                expect(a.id).not.toBe(b.id);
            }),
        );
    });
});

// ── createAssistantMessage ──────────────────────────────────────

describe("createAssistantMessage", () => {
    it("maps all response fields correctly", () => {
        const response: CompletionResponse = {
            content: "Response content",
            reasoning: "Chain of thought",
            model: "gpt-4",
            inputTokens: 100,
            outputTokens: 200,
        };
        const msg = createAssistantMessage(response, MOCK_PROVIDER);
        expect(msg.role).toBe("assistant");
        expect(msg.content).toBe("Response content");
        expect(msg.reasoning).toBe("Chain of thought");
        expect(msg.model).toBe("gpt-4");
        expect(msg.inputTokens).toBe(100);
        expect(msg.outputTokens).toBe(200);
        expect(msg.providerId).toBe("test-provider");
        expect(msg.providerLabel).toBe("Test Provider");
    });

    it("generates unique id", () => {
        const response: CompletionResponse = { content: "a" };
        const a = createAssistantMessage(response, MOCK_PROVIDER);
        const b = createAssistantMessage(response, MOCK_PROVIDER);
        expect(a.id).not.toBe(b.id);
    });

    it("includes createdAt timestamp", () => {
        const before = Date.now();
        const msg = createAssistantMessage({ content: "a" }, MOCK_PROVIDER);
        expect(msg.createdAt).toBeGreaterThanOrEqual(before);
    });

    // ── Null/undefined field handling ────────────────────────────

    it("handles null reasoning as undefined", () => {
        const msg = createAssistantMessage({ content: "a", reasoning: null }, MOCK_PROVIDER);
        expect(msg.reasoning).toBeUndefined();
    });

    it("handles undefined reasoning as undefined", () => {
        const msg = createAssistantMessage({ content: "a" }, MOCK_PROVIDER);
        expect(msg.reasoning).toBeUndefined();
    });

    it("handles empty string reasoning as empty string", () => {
        const msg = createAssistantMessage({ content: "a", reasoning: "" }, MOCK_PROVIDER);
        // "" ?? undefined → "" (empty string is not nullish)
        expect(msg.reasoning).toBe("");
    });

    it("falls back to provider model when response model is null", () => {
        const msg = createAssistantMessage({ content: "a", model: null }, MOCK_PROVIDER);
        expect(msg.model).toBe("test-model");
    });

    it("falls back to provider model when response model is undefined", () => {
        const msg = createAssistantMessage({ content: "a" }, MOCK_PROVIDER);
        expect(msg.model).toBe("test-model");
    });

    it("uses response model when provided", () => {
        const msg = createAssistantMessage({ content: "a", model: "custom" }, MOCK_PROVIDER);
        expect(msg.model).toBe("custom");
    });

    it("uses response model even if empty string", () => {
        const msg = createAssistantMessage({ content: "a", model: "" }, MOCK_PROVIDER);
        // "" ?? provider.model → "" (empty string is not nullish)
        expect(msg.model).toBe("");
    });

    it("handles null token counts as undefined", () => {
        const msg = createAssistantMessage(
            { content: "a", inputTokens: null, outputTokens: null },
            MOCK_PROVIDER,
        );
        expect(msg.inputTokens).toBeUndefined();
        expect(msg.outputTokens).toBeUndefined();
    });

    it("handles zero token counts as zero (not undefined)", () => {
        const msg = createAssistantMessage(
            { content: "a", inputTokens: 0, outputTokens: 0 },
            MOCK_PROVIDER,
        );
        // 0 ?? undefined → 0 (zero is not nullish)
        expect(msg.inputTokens).toBe(0);
        expect(msg.outputTokens).toBe(0);
    });

    it("preserves empty string content", () => {
        const msg = createAssistantMessage({ content: "" }, MOCK_PROVIDER);
        expect(msg.content).toBe("");
    });
});

// ── toCompletionMessages ────────────────────────────────────────

describe("toCompletionMessages", () => {
    // ── Basic mapping ───────────────────────────────────────────

    it("maps messages to {role, content} only", () => {
        const messages: ConversationMessage[] = [
            createUserMessage("Hello"),
            makeMsg({ role: "assistant", content: "Hi there!", model: "gpt-4", outputTokens: 5 }),
        ];
        const result = toCompletionMessages(messages);
        expect(result).toEqual([
            { role: "user", content: "Hello" },
            { role: "assistant", content: "Hi there!" },
        ]);
    });

    it("returns empty array for empty input", () => {
        expect(toCompletionMessages([])).toEqual([]);
    });

    it("preserves message order", () => {
        const messages: ConversationMessage[] = [
            createUserMessage("First"),
            makeMsg({ role: "assistant", content: "Second" }),
            createUserMessage("Third"),
        ];
        const result = toCompletionMessages(messages);
        expect(result.map((m) => m.content)).toEqual(["First", "Second", "Third"]);
    });

    // ── Filtering ───────────────────────────────────────────────

    it("filters out messages with empty content and no images", () => {
        const messages: ConversationMessage[] = [
            createUserMessage("Hello"),
            makeMsg({ role: "assistant", content: "" }),
        ];
        const result = toCompletionMessages(messages);
        expect(result).toHaveLength(1);
    });

    it("filters out messages with whitespace-only content and no images", () => {
        const messages: ConversationMessage[] = [
            createUserMessage("Hello"),
            makeMsg({ role: "assistant", content: "   " }),
            makeMsg({ role: "assistant", content: "\t\n" }),
        ];
        const result = toCompletionMessages(messages);
        expect(result).toHaveLength(1);
    });

    it("keeps messages with whitespace-only content if they have images", () => {
        const messages: ConversationMessage[] = [
            makeMsg({
                role: "user",
                content: "   ",
                images: ["data:image/png;base64,abc"],
            }),
        ];
        const result = toCompletionMessages(messages);
        expect(result).toHaveLength(1);
        // Content part should be omitted (whitespace only trim is falsy), only image part
        const parts = result[0].content;
        expect(Array.isArray(parts)).toBe(true);
        if (Array.isArray(parts)) {
            // No text part since content.trim() is falsy
            expect(parts.every((p) => p.type === "image_url")).toBe(true);
        }
    });

    // ── Multimodal (images) path ────────────────────────────────

    it("converts message with images to multipart content array", () => {
        const msg = makeMsg({
            role: "user",
            content: "Describe this",
            images: ["data:image/png;base64,abc123"],
        });
        const result = toCompletionMessages([msg]);
        expect(result).toHaveLength(1);
        const content = result[0].content;
        expect(Array.isArray(content)).toBe(true);
        if (Array.isArray(content)) {
            expect(content).toEqual([
                { type: "text", text: "Describe this" },
                { type: "image_url", image_url: { url: "data:image/png;base64,abc123" } },
            ]);
        }
    });

    it("includes multiple images as separate image_url parts", () => {
        const msg = makeMsg({
            role: "user",
            content: "Compare these",
            images: ["data:image/png;base64,img1", "data:image/jpeg;base64,img2"],
        });
        const result = toCompletionMessages([msg]);
        const content = result[0].content;
        expect(Array.isArray(content)).toBe(true);
        if (Array.isArray(content)) {
            expect(content).toHaveLength(3); // 1 text + 2 images
            expect(content[0]).toEqual({ type: "text", text: "Compare these" });
            expect(content[1]).toEqual({
                type: "image_url",
                image_url: { url: "data:image/png;base64,img1" },
            });
            expect(content[2]).toEqual({
                type: "image_url",
                image_url: { url: "data:image/jpeg;base64,img2" },
            });
        }
    });

    it("omits text part when content is empty but images exist", () => {
        const msg = makeMsg({
            role: "user",
            content: "",
            images: ["data:image/png;base64,abc"],
        });
        const result = toCompletionMessages([msg]);
        expect(result).toHaveLength(1);
        const content = result[0].content;
        expect(Array.isArray(content)).toBe(true);
        if (Array.isArray(content)) {
            expect(content).toHaveLength(1); // only image, no text
            expect(content[0].type).toBe("image_url");
        }
    });

    it("returns string content (not array) when no images", () => {
        const msg = createUserMessage("Just text");
        const result = toCompletionMessages([msg]);
        expect(typeof result[0].content).toBe("string");
    });

    it("preserves original content string (no trimming) in output", () => {
        const msg = createUserMessage("  padded  ");
        const result = toCompletionMessages([msg]);
        expect(result[0].content).toBe("  padded  ");
    });

    // ── Mixed messages ──────────────────────────────────────────

    it("handles mix of text-only and multimodal messages", () => {
        const messages: ConversationMessage[] = [
            createUserMessage("Hello"),
            makeMsg({
                role: "user",
                content: "Look at this",
                images: ["data:image/png;base64,img1"],
            }),
            makeMsg({ role: "assistant", content: "I see it" }),
        ];
        const result = toCompletionMessages(messages);
        expect(result).toHaveLength(3);
        expect(typeof result[0].content).toBe("string");
        expect(Array.isArray(result[1].content)).toBe(true);
        expect(typeof result[2].content).toBe("string");
    });

    it("filters empty messages while keeping image messages", () => {
        const messages: ConversationMessage[] = [
            makeMsg({ role: "assistant", content: "" }), // filtered
            makeMsg({
                role: "user",
                content: "",
                images: ["data:image/png;base64,img1"],
            }), // kept (has images)
        ];
        const result = toCompletionMessages(messages);
        expect(result).toHaveLength(1);
        expect(result[0].role).toBe("user");
    });

    // ── Property-based ──────────────────────────────────────────

    it("property: output length is always ≤ input length", () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        role: fc.constantFrom("user" as const, "assistant" as const),
                        content: fc.string(),
                        createdAt: fc.nat(),
                    }),
                    { maxLength: 20 },
                ),
                (messages) => {
                    const result = toCompletionMessages(messages);
                    expect(result.length).toBeLessThanOrEqual(messages.length);
                },
            ),
        );
    });

    it("property: every output message has role 'user' or 'assistant'", () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        role: fc.constantFrom("user" as const, "assistant" as const),
                        content: fc.string({ minLength: 1 }),
                        createdAt: fc.nat(),
                    }),
                    { maxLength: 10 },
                ),
                (messages) => {
                    const result = toCompletionMessages(messages);
                    for (const msg of result) {
                        expect(["user", "assistant"]).toContain(msg.role);
                    }
                },
            ),
        );
    });
});
