import { describe, expect, it } from "vitest";
import {
  chatCompletionsEndpoint,
  ThinkTagParser,
  partialTagMatch,
  stripThinkTags,
  extractContentText,
} from "@/lib/native";

// ── Endpoint builder ────────────────────────────────────────

describe("chatCompletionsEndpoint", () => {
  it("appends /v1/chat/completions to bare host", () => {
    expect(chatCompletionsEndpoint("http://localhost:1234")).toBe(
      "http://localhost:1234/v1/chat/completions",
    );
  });

  it("strips trailing slashes before appending", () => {
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
});

// ── ThinkTagParser (streaming) ──────────────────────────────

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

  it("handles <think> split across multiple chunks", () => {
    const parser = new ThinkTagParser();

    let r1 = parser.process("<thi");
    expect(r1.content).toBe("");
    expect(r1.reasoning).toBe("");

    let r2 = parser.process("nk>inside");
    expect(r2.reasoning).toBe("inside");

    let r3 = parser.process("</think>after");
    expect(r3.content).toBe("after");
  });

  it("handles closing tag split across chunks", () => {
    const parser = new ThinkTagParser();
    parser.process("<think>start");
    const r = parser.process("</thi");
    // Partial close tag should be buffered
    expect(r.reasoning).toBe("");
    const r2 = parser.process("nk>done");
    expect(r2.content).toBe("done");
  });

  it("flush() releases pending buffer as reasoning when inside think", () => {
    const parser = new ThinkTagParser();
    // "partial" is emitted as reasoning during process, not buffered
    const result = parser.process("<think>partial");
    expect(result.reasoning).toBe("partial");
    // flush returns empty since nothing is in the pending buffer
    const flushed = parser.flush();
    expect(flushed.reasoning).toBe("");
    expect(flushed.content).toBe("");
  });

  it("flush() returns content if not inside think tag", () => {
    const parser = new ThinkTagParser();
    parser.process("partial<thi");
    const flushed = parser.flush();
    // "<thi" is a partial open tag, buffered. Flush should return it as content
    expect(flushed.content).toBe("<thi");
  });

  it("handles multiple <think> blocks in one chunk", () => {
    const parser = new ThinkTagParser();
    const result = parser.process(
      "<think>r1</think>content1<think>r2</think>content2",
    );
    expect(result.reasoning).toBe("r1r2");
    expect(result.content).toBe("content1content2");
  });
});

// ── partialTagMatch ─────────────────────────────────────────

describe("partialTagMatch", () => {
  it("returns 0 when no partial match", () => {
    expect(partialTagMatch("hello", "<think>")).toBe(0);
  });

  it("detects partial opening tag at the end of text", () => {
    expect(partialTagMatch("hello<thi", "<think>")).toBe(4);
    expect(partialTagMatch("hello<", "<think>")).toBe(1);
  });

  it("detects full tag-minus-one as partial", () => {
    expect(partialTagMatch("x<think", "<think>")).toBe(6);
  });

  it("returns 0 for empty text", () => {
    expect(partialTagMatch("", "<think>")).toBe(0);
  });
});

// ── stripThinkTags (non-streaming, regex) ───────────────────

describe("stripThinkTags", () => {
  it("strips a single think block", () => {
    const result = stripThinkTags("<think>reasoning</think>answer");
    expect(result).toEqual({ content: "answer", reasoning: "reasoning" });
  });

  it("strips multiple think blocks", () => {
    const result = stripThinkTags(
      "<think>r1</think>middle<think>r2</think>end",
    );
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
});

// ── extractContentText ──────────────────────────────────────

describe("extractContentText", () => {
  it("returns a string as-is", () => {
    expect(extractContentText("hello")).toBe("hello");
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

  it("returns empty string for an empty array", () => {
    expect(extractContentText([])).toBe("");
  });
});
