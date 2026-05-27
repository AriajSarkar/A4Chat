import { describe, expect, it } from "vitest";

import { parseProviderModelCache, serializeProviderModelCache } from "@/lib/ModelCache";

describe("model cache helpers", () => {
  const model = {
    modelId: "openai/gpt-4o-mini",
    displayName: "GPT-4o mini",
    isFavorite: true,
    lastSeenAt: 1_725_000_000_000,
  };

  it("serializes cache entries", () => {
    expect(serializeProviderModelCache({ checkedAt: 1_725_000_000_000, models: [model] })).toBe(
      JSON.stringify({ checkedAt: 1_725_000_000_000, models: [model] }),
    );
  });

  it("parses valid cache payloads", () => {
    expect(
      parseProviderModelCache({
        checkedAt: 1_725_000_000_000,
        models: [model],
      }),
    ).toEqual({
      checkedAt: 1_725_000_000_000,
      models: [model],
    });
  });

  it("rejects invalid cache payloads", () => {
    expect(parseProviderModelCache(null)).toBeNull();
    expect(parseProviderModelCache({ checkedAt: "now", models: [] })).toBeNull();
    expect(
      parseProviderModelCache({
        checkedAt: 1_725_000_000_000,
        models: [{ ...model, lastSeenAt: "nope" }],
      }),
    ).toBeNull();
  });
});
