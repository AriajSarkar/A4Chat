import { describe, expect, it } from "vitest";
import {
  createUserMessage,
  createAssistantMessage,
  toCompletionMessages,
  type ConversationMessage,
  type CompletionResponse,
} from "@/lib/Conversation";
import type { ProviderSettings } from "@/lib/Providers";

const MOCK_PROVIDER: ProviderSettings = {
  id: "test-provider",
  label: "Test Provider",
  baseUrl: "http://localhost:1234/v1",
  apiKey: "",
  model: "test-model",
  enabled: true,
};

// ── createUserMessage ───────────────────────────────────────

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

  it("includes a createdAt timestamp", () => {
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
    expect(msg.model).toBeUndefined();
    expect(msg.inputTokens).toBeUndefined();
    expect(msg.outputTokens).toBeUndefined();
  });
});

// ── createAssistantMessage ──────────────────────────────────

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

  it("handles null reasoning as undefined", () => {
    const response: CompletionResponse = {
      content: "Answer",
      reasoning: null,
    };
    const msg = createAssistantMessage(response, MOCK_PROVIDER);
    expect(msg.reasoning).toBeUndefined();
  });

  it("falls back to provider model when response model is null", () => {
    const response: CompletionResponse = {
      content: "Answer",
      model: null,
    };
    const msg = createAssistantMessage(response, MOCK_PROVIDER);
    expect(msg.model).toBe("test-model");
  });

  it("handles null token counts as undefined", () => {
    const response: CompletionResponse = {
      content: "Answer",
      inputTokens: null,
      outputTokens: null,
    };
    const msg = createAssistantMessage(response, MOCK_PROVIDER);
    expect(msg.inputTokens).toBeUndefined();
    expect(msg.outputTokens).toBeUndefined();
  });
});

// ── toCompletionMessages ────────────────────────────────────

describe("toCompletionMessages", () => {
  it("maps messages to {role, content} only", () => {
    const messages: ConversationMessage[] = [
      createUserMessage("Hello"),
      {
        id: "2",
        role: "assistant",
        content: "Hi there!",
        createdAt: Date.now(),
        model: "gpt-4",
        outputTokens: 5,
      },
    ];
    const result = toCompletionMessages(messages);
    expect(result).toEqual([
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!" },
    ]);
  });

  it("filters out messages with empty content", () => {
    const messages: ConversationMessage[] = [
      createUserMessage("Hello"),
      { id: "2", role: "assistant", content: "", createdAt: Date.now() },
      { id: "3", role: "assistant", content: "   ", createdAt: Date.now() },
    ];
    const result = toCompletionMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("Hello");
  });

  it("returns empty array for empty input", () => {
    expect(toCompletionMessages([])).toEqual([]);
  });

  it("preserves message order", () => {
    const messages: ConversationMessage[] = [
      createUserMessage("First"),
      { id: "a", role: "assistant", content: "Second", createdAt: Date.now() },
      createUserMessage("Third"),
    ];
    const result = toCompletionMessages(messages);
    expect(result.map((m) => m.content)).toEqual(["First", "Second", "Third"]);
  });
});
