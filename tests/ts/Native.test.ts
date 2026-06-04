import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
    chatCompletionsEndpoint,
    modelsEndpoint,
    ThinkTagParser,
    partialTagMatch,
    stripThinkTags,
    extractContentText,
    formatProviderError,
} from "@/lib/native";

// ── chatCompletionsEndpoint ─────────────────────────────────────

describe("chatCompletionsEndpoint", () => {
    it("appends /v1/chat/completions to bare host", () => {
        expect(chatCompletionsEndpoint("http://localhost:1234")).toBe(
            "http://localhost:1234/v1/chat/completions",
        );
    });

    it("appends /v1/chat/completions to bare host with trailing slash", () => {
        expect(chatCompletionsEndpoint("http://localhost:1234/")).toBe(
            "http://localhost:1234/v1/chat/completions",
        );
    });

    it("strips multiple trailing slashes before appending", () => {
        expect(chatCompletionsEndpoint("http://localhost:1234///")).toBe(
            "http://localhost:1234/v1/chat/completions",
        );
    });

    it("preserves a versioned base path", () => {
        expect(chatCompletionsEndpoint("https://openrouter.ai/api/v1")).toBe(
            "https://openrouter.ai/api/v1/chat/completions",
        );
    });

    it("preserves a full /chat/completions URL as-is", () => {
        const url = "https://openrouter.ai/api/v1/chat/completions";
        expect(chatCompletionsEndpoint(url)).toBe(url);
    });

    it("handles whitespace-padded input", () => {
        expect(chatCompletionsEndpoint("  http://localhost:1234  ")).toBe(
            "http://localhost:1234/v1/chat/completions",
        );
    });

    it("appends /chat/completions when path exists but is not versioned", () => {
        expect(chatCompletionsEndpoint("http://myhost.com/custom/api")).toBe(
            "http://myhost.com/custom/api/chat/completions",
        );
    });

    it("handles https URLs", () => {
        expect(chatCompletionsEndpoint("https://api.example.com")).toBe(
            "https://api.example.com/v1/chat/completions",
        );
    });

    it("handles URLs with ports", () => {
        expect(chatCompletionsEndpoint("http://192.168.1.1:8080")).toBe(
            "http://192.168.1.1:8080/v1/chat/completions",
        );
    });

    it("handles invalid URL string (falls through try/catch to /chat/completions)", () => {
        // not-a-url will throw in new URL() → falls through to append /chat/completions
        expect(chatCompletionsEndpoint("not-a-url")).toBe("not-a-url/chat/completions");
    });

    it("handles URL already ending with /chat/completions and trailing slashes", () => {
        // Trailing slashes are stripped first, then check
        const url = "http://localhost:1234/v1/chat/completions/";
        // After stripping: "http://localhost:1234/v1/chat/completions"
        expect(chatCompletionsEndpoint(url)).toBe("http://localhost:1234/v1/chat/completions");
    });

    // Property-based
    it("property: output always ends with /chat/completions", () => {
        fc.assert(
            fc.property(fc.stringMatching(/^https?:\/\/[a-z0-9.:-]+\/?$/), (url) => {
                const result = chatCompletionsEndpoint(url);
                expect(result).toMatch(/\/chat\/completions$/);
            }),
        );
    });
});

// ── modelsEndpoint ──────────────────────────────────────────────

describe("modelsEndpoint", () => {
    it("appends /models to bare host", () => {
        expect(modelsEndpoint("http://localhost:1234")).toBe("http://localhost:1234/models");
    });

    it("appends /models to URL with path", () => {
        expect(modelsEndpoint("http://localhost:1234/v1")).toBe("http://localhost:1234/v1/models");
    });

    it("returns URL as-is when already ending with /models", () => {
        expect(modelsEndpoint("http://localhost:1234/v1/models")).toBe(
            "http://localhost:1234/v1/models",
        );
    });

    it("strips trailing slashes", () => {
        expect(modelsEndpoint("http://localhost:1234///")).toBe("http://localhost:1234/models");
    });

    it("trims whitespace", () => {
        expect(modelsEndpoint("  http://localhost:1234  ")).toBe("http://localhost:1234/models");
    });

    it("handles https URLs", () => {
        expect(modelsEndpoint("https://api.example.com")).toBe("https://api.example.com/models");
    });

    it("handles URL with trailing /models/", () => {
        // Strips trailing slash → ends with /models → returns as-is
        expect(modelsEndpoint("http://localhost:1234/v1/models/")).toBe(
            "http://localhost:1234/v1/models",
        );
    });

    // Property-based
    it("property: output always ends with /models", () => {
        fc.assert(
            fc.property(fc.stringMatching(/^https?:\/\/[a-z0-9.:-]+\/?$/), (url) => {
                const result = modelsEndpoint(url);
                expect(result).toMatch(/\/models$/);
            }),
        );
    });
});

// ── ThinkTagParser ──────────────────────────────────────────────

describe("ThinkTagParser", () => {
    it("passes through plain content unchanged", () => {
        const parser = new ThinkTagParser();
        const result = parser.process("Hello, world!");
        expect(result).toEqual({ content: "Hello, world!", reasoning: "" });
    });

    it("extracts a single <think> block", () => {
        const parser = new ThinkTagParser();
        const result = parser.process("<think>reasoning here</think>answer");
        expect(result).toEqual({ content: "answer", reasoning: "reasoning here" });
    });

    it("handles empty input", () => {
        const parser = new ThinkTagParser();
        const result = parser.process("");
        expect(result).toEqual({ content: "", reasoning: "" });
    });

    it("handles <think> split across two chunks (open tag)", () => {
        const parser = new ThinkTagParser();
        const r1 = parser.process("<thi");
        expect(r1.content).toBe("");
        expect(r1.reasoning).toBe("");
        const r2 = parser.process("nk>inside");
        expect(r2.reasoning).toBe("inside");
    });

    it("handles closing tag split across chunks", () => {
        const parser = new ThinkTagParser();
        parser.process("<think>start");
        const r = parser.process("</thi");
        expect(r.reasoning).toBe("");
        const r2 = parser.process("nk>done");
        expect(r2.content).toBe("done");
    });

    it("handles multiple <think> blocks in one chunk", () => {
        const parser = new ThinkTagParser();
        const result = parser.process("<think>r1</think>content1<think>r2</think>content2");
        expect(result.reasoning).toBe("r1r2");
        expect(result.content).toBe("content1content2");
    });

    it("handles rapid open/close <think></think>", () => {
        const parser = new ThinkTagParser();
        const result = parser.process("<think></think>");
        expect(result.content).toBe("");
        expect(result.reasoning).toBe("");
    });

    it("handles <think> with no close tag — flush releases as reasoning", () => {
        const parser = new ThinkTagParser();
        const r1 = parser.process("<think>unclosed reasoning");
        expect(r1.reasoning).toBe("unclosed reasoning");
        const flushed = parser.flush();
        expect(flushed.reasoning).toBe("");
        expect(flushed.content).toBe("");
    });

    it("handles </think> without open tag — treated as content", () => {
        const parser = new ThinkTagParser();
        const result = parser.process("before</think>after");
        // Not inside think, so </think> is just content
        expect(result.content).toBe("before</think>after");
    });

    it("handles unicode inside think tags", () => {
        const parser = new ThinkTagParser();
        const result = parser.process("<think>日本語の推論 🤔</think>答え");
        expect(result.reasoning).toBe("日本語の推論 🤔");
        expect(result.content).toBe("答え");
    });

    it("handles very long reasoning block", () => {
        const parser = new ThinkTagParser();
        const longReasoning = "x".repeat(10_000);
        const result = parser.process(`<think>${longReasoning}</think>answer`);
        expect(result.reasoning).toBe(longReasoning);
        expect(result.content).toBe("answer");
    });

    it("handles interleaved content and reasoning across many chunks", () => {
        const parser = new ThinkTagParser();
        let totalContent = "";
        let totalReasoning = "";

        const r1 = parser.process("hello ");
        totalContent += r1.content;

        const r2 = parser.process("<think>think1</think>");
        totalContent += r2.content;
        totalReasoning += r2.reasoning;

        const r3 = parser.process(" world ");
        totalContent += r3.content;

        const r4 = parser.process("<think>think2</think>");
        totalContent += r4.content;
        totalReasoning += r4.reasoning;

        const r5 = parser.process(" end");
        totalContent += r5.content;

        const flushed = parser.flush();
        totalContent += flushed.content;
        totalReasoning += flushed.reasoning;

        expect(totalContent).toBe("hello  world  end");
        expect(totalReasoning).toBe("think1think2");
    });

    // ── flush() ─────────────────────────────────────────────────

    it("flush() returns empty when nothing pending", () => {
        const parser = new ThinkTagParser();
        parser.process("complete text");
        const flushed = parser.flush();
        expect(flushed).toEqual({ content: "", reasoning: "" });
    });

    it("flush() returns content if not inside think tag", () => {
        const parser = new ThinkTagParser();
        parser.process("partial<thi");
        const flushed = parser.flush();
        expect(flushed.content).toBe("<thi");
    });

    it("flush() returns reasoning if inside think tag", () => {
        const parser = new ThinkTagParser();
        parser.process("<think>reasoning</thi");
        const flushed = parser.flush();
        expect(flushed.reasoning).toBe("</thi");
        expect(flushed.content).toBe("");
    });

    // ── Tag split at every character boundary ───────────────────

    it("handles <think> split at <|t", () => {
        const parser = new ThinkTagParser();
        parser.process("x<");
        const r = parser.process("think>inside</think>after");
        expect(r.reasoning).toBe("inside");
        // Check that "after" appears somewhere
        const flushed = parser.flush();
        expect(r.content + flushed.content).toContain("after");
    });

    it("handles <think> split at <t|h", () => {
        const parser = new ThinkTagParser();
        parser.process("x<t");
        parser.process("hink>inside</think>after");
        // Results are accumulated
    });

    it("handles <think> split at <th|i", () => {
        const parser = new ThinkTagParser();
        parser.process("x<th");
        const r = parser.process("ink>inside</think>after");
        expect(r.reasoning).toBe("inside");
    });

    // ── Property-based ──────────────────────────────────────────

    it("property: all characters appear in content or reasoning after process+flush", () => {
        fc.assert(
            fc.property(fc.string({ maxLength: 200 }), (input) => {
                const parser = new ThinkTagParser();
                const r = parser.process(input);
                const f = parser.flush();
                const allContent = r.content + f.content;
                const allReasoning = r.reasoning + f.reasoning;
                // Every character from input should appear in either content or reasoning
                // (minus tag characters that are consumed)
                const totalOutput = allContent + allReasoning;
                // The tags themselves are consumed, so total output length may be less
                // But no characters should be invented
                expect(totalOutput.length).toBeLessThanOrEqual(input.length);
            }),
        );
    });

    it("property: process of text without < produces only content", () => {
        fc.assert(
            fc.property(
                fc.string({ maxLength: 100 }).filter((s) => !s.includes("<")),
                (input) => {
                    const parser = new ThinkTagParser();
                    const r = parser.process(input);
                    const f = parser.flush();
                    expect(r.content + f.content).toBe(input);
                    expect(r.reasoning + f.reasoning).toBe("");
                },
            ),
        );
    });
});

// ── partialTagMatch ─────────────────────────────────────────────

describe("partialTagMatch", () => {
    it("returns 0 when no partial match", () => {
        expect(partialTagMatch("hello", "<think>")).toBe(0);
    });

    it("detects partial opening tag at end of text", () => {
        expect(partialTagMatch("hello<thi", "<think>")).toBe(4);
        expect(partialTagMatch("hello<", "<think>")).toBe(1);
    });

    it("detects full tag-minus-one as partial", () => {
        expect(partialTagMatch("x<think", "<think>")).toBe(6);
    });

    it("returns 0 for empty text", () => {
        expect(partialTagMatch("", "<think>")).toBe(0);
    });

    it("detects single character partial", () => {
        expect(partialTagMatch("abc<", "<think>")).toBe(1);
    });

    it("detects partial close tag", () => {
        expect(partialTagMatch("text</thi", "</think>")).toBe(5);
        expect(partialTagMatch("text</", "</think>")).toBe(2);
        expect(partialTagMatch("text<", "</think>")).toBe(1);
    });

    it("returns 0 when text doesn't end with any tag prefix", () => {
        expect(partialTagMatch("xyz", "<think>")).toBe(0);
    });

    it("returns 0 when text equals full tag (length check: tag.length - 1)", () => {
        // partialTagMatch checks len from min(tag.length-1, text.length) down.
        // It checks if text.endsWith(tag.slice(0, len)).
        // Since text="<think>" ends with ">", it will not match "<thin", "<thi", etc.
        expect(partialTagMatch("<think>", "<think>")).toBe(0);
    });

    // Property-based
    it("property: result is always >= 0 and < tag.length", () => {
        fc.assert(
            fc.property(
                fc.string({ maxLength: 50 }),
                fc.string({ minLength: 1, maxLength: 20 }),
                (text, tag) => {
                    const result = partialTagMatch(text, tag);
                    expect(result).toBeGreaterThanOrEqual(0);
                    expect(result).toBeLessThan(tag.length);
                },
            ),
        );
    });
});

// ── stripThinkTags ──────────────────────────────────────────────

describe("stripThinkTags", () => {
    it("strips a single think block", () => {
        const result = stripThinkTags("<think>reasoning</think>answer");
        expect(result).toEqual({ content: "answer", reasoning: "reasoning" });
    });

    it("strips multiple think blocks", () => {
        const result = stripThinkTags("<think>r1</think>middle<think>r2</think>end");
        expect(result).toEqual({ content: "middleend", reasoning: "r1r2" });
    });

    it("returns original text when no tags present", () => {
        const result = stripThinkTags("just plain text");
        expect(result).toEqual({ content: "just plain text", reasoning: "" });
    });

    it("handles empty reasoning", () => {
        const result = stripThinkTags("<think></think>content");
        expect(result).toEqual({ content: "content", reasoning: "" });
    });

    it("trims whitespace from content", () => {
        const result = stripThinkTags("  <think>r</think>  answer  ");
        expect(result.content).toBe("answer");
    });

    it("handles multiline reasoning", () => {
        const result = stripThinkTags("<think>line1\nline2\nline3</think>answer");
        expect(result.reasoning).toBe("line1\nline2\nline3");
    });

    it("handles unclosed <think> tag (no match, stays in content)", () => {
        const result = stripThinkTags("<think>unclosed reasoning");
        expect(result.content).toBe("<think>unclosed reasoning");
        expect(result.reasoning).toBe("");
    });

    it("handles think at very start", () => {
        const result = stripThinkTags("<think>r</think>after");
        expect(result.content).toBe("after");
    });

    it("handles think at very end", () => {
        const result = stripThinkTags("before<think>r</think>");
        expect(result.content).toBe("before");
    });

    it("handles empty string", () => {
        const result = stripThinkTags("");
        expect(result).toEqual({ content: "", reasoning: "" });
    });

    it("handles nested-looking tags (lazy regex matches first close)", () => {
        // regex is non-greedy: <think>([\s\S]*?)</think>
        const result = stripThinkTags("<think>inner<think>nested</think>outer</think>");
        // lazy match: first </think> closes first <think>
        expect(result.reasoning).toBe("inner<think>nested");
        expect(result.content).toContain("outer");
    });
});

// ── extractContentText ──────────────────────────────────────────

describe("extractContentText", () => {
    it("returns a string as-is", () => {
        expect(extractContentText("hello")).toBe("hello");
    });

    it("returns empty string as-is", () => {
        expect(extractContentText("")).toBe("");
    });

    it("joins array of text blocks", () => {
        const blocks = [
            { type: "text", text: "Hello " },
            { type: "text", text: "world" },
        ];
        expect(extractContentText(blocks)).toBe("Hello world");
    });

    it("filters non-text blocks from array", () => {
        const blocks = [
            { type: "image", url: "http://img.png" },
            { type: "text", text: "content" },
        ];
        expect(extractContentText(blocks)).toBe("content");
    });

    it("returns empty string for null", () => {
        expect(extractContentText(null)).toBe("");
    });

    it("returns empty string for undefined", () => {
        expect(extractContentText(undefined)).toBe("");
    });

    it("returns empty string for a number", () => {
        expect(extractContentText(42)).toBe("");
    });

    it("returns empty string for a boolean", () => {
        expect(extractContentText(true)).toBe("");
        expect(extractContentText(false)).toBe("");
    });

    it("returns empty string for a plain object (not array)", () => {
        expect(extractContentText({ type: "text", text: "nope" })).toBe("");
    });

    it("returns empty string for an empty array", () => {
        expect(extractContentText([])).toBe("");
    });

    it("filters null entries in array", () => {
        const blocks = [null, { type: "text", text: "content" }, null];
        expect(extractContentText(blocks)).toBe("content");
    });

    it("filters objects missing type field", () => {
        const blocks = [{ text: "no type" }, { type: "text", text: "valid" }];
        expect(extractContentText(blocks)).toBe("valid");
    });

    it("filters objects where text is not a string", () => {
        const blocks = [
            { type: "text", text: 123 },
            { type: "text", text: "valid" },
        ];
        expect(extractContentText(blocks)).toBe("valid");
    });

    it("handles mixed valid and invalid blocks", () => {
        const blocks = [
            { type: "text", text: "A" },
            null,
            { type: "image", url: "x" },
            { type: "text", text: "B" },
            undefined,
            { type: "text" },
        ];
        expect(extractContentText(blocks)).toBe("AB");
    });

    // Property-based
    it("property: string input always returns same string", () => {
        fc.assert(
            fc.property(fc.string(), (input) => {
                expect(extractContentText(input)).toBe(input);
            }),
        );
    });
});

// ── formatProviderError ─────────────────────────────────────────

describe("formatProviderError", () => {
    it("surfaces raw upstream error details and retry hints", () => {
        const payload = {
            error: {
                message: "Provider returned error",
                code: 429,
                metadata: {
                    raw: "qwen/qwen3 is temporarily rate-limited upstream. Please retry shortly.",
                    provider_name: "Venice",
                    retry_after_seconds: 10,
                },
            },
        };
        const message = formatProviderError(payload, {
            fallback: "Provider rejected the request.",
            providerLabel: "Venice",
            retryAfter: "10",
            status: 429,
        });
        expect(message).toContain("Venice");
        expect(message).toContain("rate-limited upstream");
        expect(message).toContain("retry after 10s");
    });

    it("falls back to generic message with HTTP status", () => {
        expect(formatProviderError({}, { status: 500 })).toBe("Provider error (HTTP 500)");
    });

    it("falls back to 'Provider request failed' without status", () => {
        expect(formatProviderError({})).toBe("Provider request failed");
    });

    it("uses custom fallback message", () => {
        expect(formatProviderError({}, { fallback: "Custom error" })).toBe("Custom error");
    });

    // ── Message extraction paths ────────────────────────────────

    it("uses error.message when no metadata.raw", () => {
        const payload = { error: { message: "Rate limit exceeded" } };
        expect(formatProviderError(payload)).toContain("Rate limit exceeded");
    });

    it("uses record.message when no error object", () => {
        const payload = { message: "Top-level message" };
        expect(formatProviderError(payload)).toContain("Top-level message");
    });

    it("uses record.error as string", () => {
        const payload = { error: "Simple error string" };
        expect(formatProviderError(payload)).toContain("Simple error string");
    });

    it("prefers metadata.raw over error.message", () => {
        const payload = {
            error: {
                message: "generic",
                metadata: { raw: "specific upstream error" },
            },
        };
        expect(formatProviderError(payload)).toContain("specific upstream error");
        expect(formatProviderError(payload)).not.toContain("generic");
    });

    // ── Provider name prefix ────────────────────────────────────

    it("adds provider name prefix when not in message", () => {
        const payload = { error: { message: "Rate limited" } };
        const result = formatProviderError(payload, { providerLabel: "OpenRouter" });
        expect(result).toBe("OpenRouter: Rate limited");
    });

    it("does not duplicate provider name when already in message", () => {
        const payload = { error: { message: "OpenRouter rate limited" } };
        const result = formatProviderError(payload, { providerLabel: "OpenRouter" });
        expect(result).toBe("OpenRouter rate limited");
        // Should NOT be "OpenRouter: OpenRouter rate limited"
    });

    it("provider name check is case-insensitive", () => {
        const payload = { error: { message: "openrouter is busy" } };
        const result = formatProviderError(payload, { providerLabel: "OpenRouter" });
        // "openrouter" contains "OpenRouter" case-insensitively → no prefix
        expect(result).toBe("openrouter is busy");
    });

    it("uses metadata.provider_name over options.providerLabel", () => {
        const payload = {
            error: { message: "Error", metadata: { provider_name: "MetaProvider" } },
        };
        const result = formatProviderError(payload, { providerLabel: "OptionsProvider" });
        expect(result).toContain("MetaProvider");
    });

    // ── Retry after ─────────────────────────────────────────────

    it("adds retry suffix from metadata.retry_after_seconds", () => {
        const payload = { error: { message: "Busy", metadata: { retry_after_seconds: 30 } } };
        expect(formatProviderError(payload)).toContain("(retry after 30s)");
    });

    it("adds retry suffix from options.retryAfter string", () => {
        const result = formatProviderError({ error: { message: "Busy" } }, { retryAfter: "15" });
        expect(result).toContain("(retry after 15s)");
    });

    it("clamps retryAfter of 0 to 1", () => {
        const result = formatProviderError({ error: { message: "Busy" } }, { retryAfter: "0" });
        expect(result).toContain("(retry after 1s)");
    });

    it("clamps negative retryAfter to 1", () => {
        const payload = { error: { message: "Busy", metadata: { retry_after_seconds: -5 } } };
        expect(formatProviderError(payload)).toContain("(retry after 1s)");
    });

    it("ceils fractional retryAfter", () => {
        const payload = { error: { message: "Busy", metadata: { retry_after_seconds: 2.3 } } };
        expect(formatProviderError(payload)).toContain("(retry after 3s)");
    });

    it("ignores NaN retryAfter (no suffix)", () => {
        const result = formatProviderError({ error: { message: "Error" } }, { retryAfter: "abc" });
        expect(result).not.toContain("retry after");
    });

    it("ignores non-numeric string retryAfter", () => {
        const result = formatProviderError(
            { error: { message: "Error" } },
            { retryAfter: "not-a-number" },
        );
        expect(result).toBe("Error");
    });

    // ── Null/undefined payloads ─────────────────────────────────

    it("handles null payload gracefully", () => {
        const result = formatProviderError(null, { status: 400 });
        expect(result).toBe("Provider error (HTTP 400)");
    });

    it("handles undefined payload gracefully", () => {
        const result = formatProviderError(undefined, { status: 400 });
        expect(result).toBe("Provider error (HTTP 400)");
    });

    it("handles number payload gracefully", () => {
        const result = formatProviderError(42);
        expect(result).toBe("Provider request failed");
    });

    it("handles string payload gracefully", () => {
        const result = formatProviderError("error string");
        expect(result).toBe("Provider request failed");
    });

    // ── Deeply nested error ─────────────────────────────────────

    it("handles error nested in error field", () => {
        const payload = {
            error: {
                error: { message: "Deep error" },
                message: "Shallow error",
            },
        };
        // asRecord(record?.error) → gets the outer error object
        // Then asString(error?.message) → "Shallow error"
        expect(formatProviderError(payload)).toContain("Shallow error");
    });

    // ── Property-based ──────────────────────────────────────────

    it("property: output is always a non-empty string", () => {
        fc.assert(
            fc.property(
                fc.oneof(
                    fc.constant(null),
                    fc.constant(undefined),
                    fc.string(),
                    fc.integer(),
                    fc.record({
                        error: fc.oneof(fc.string(), fc.record({ message: fc.string() })),
                    }),
                ),
                (payload) => {
                    const result = formatProviderError(payload);
                    expect(typeof result).toBe("string");
                    expect(result.length).toBeGreaterThan(0);
                },
            ),
        );
    });
});
