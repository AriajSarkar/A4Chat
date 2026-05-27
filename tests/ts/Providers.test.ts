import { describe, expect, it } from "vitest";
import {
  providerSchema,
  normalizeProviders,
  findActiveProvider,
  DEFAULT_PROVIDERS,
  MODEL_AUTO_REFRESH_MS,
  MODEL_REFRESH_COOLDOWN_MS,
  formatCompactDuration,
  formatModelCacheAge,
  getLatestModelSyncAt,
  getModelRefreshCooldownRemainingMs,
  isModelCacheStale,
  type ProviderSettings,
} from "@/lib/Providers";

// ── providerSchema ──────────────────────────────────────────

describe("providerSchema", () => {
  const VALID_PROVIDER = {
    id: "test",
    label: "Test",
    baseUrl: "http://localhost:1234",
    apiKey: "sk-123",
    model: "gpt-4",
    enabled: true,
  };

  it("accepts a valid provider", () => {
    const result = providerSchema.safeParse(VALID_PROVIDER);
    expect(result.success).toBe(true);
  });

  it("defaults apiKey to empty string when null", () => {
    const result = providerSchema.safeParse({
      ...VALID_PROVIDER,
      apiKey: null,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.apiKey).toBe("");
  });

  it("defaults enabled to true when undefined", () => {
    const { enabled: _, ...without } = VALID_PROVIDER;
    const result = providerSchema.safeParse(without);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.enabled).toBe(true);
  });

  it("rejects empty id", () => {
    const result = providerSchema.safeParse({ ...VALID_PROVIDER, id: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty label", () => {
    const result = providerSchema.safeParse({ ...VALID_PROVIDER, label: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid URL", () => {
    const result = providerSchema.safeParse({
      ...VALID_PROVIDER,
      baseUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("allows empty model strings for blank providers", () => {
    const result = providerSchema.safeParse({ ...VALID_PROVIDER, model: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.model).toBe("");
  });
});

// ── normalizeProviders ──────────────────────────────────────

describe("normalizeProviders", () => {
  it("returns defaults for completely invalid input", () => {
    const result = normalizeProviders("garbage");
    expect(result).toEqual(DEFAULT_PROVIDERS);
  });

  it("returns defaults for null", () => {
    expect(normalizeProviders(null)).toEqual(DEFAULT_PROVIDERS);
  });

  it("returns defaults for empty array", () => {
    expect(normalizeProviders([])).toEqual(DEFAULT_PROVIDERS);
  });

  it("merges valid providers over defaults by id", () => {
    const custom: ProviderSettings[] = [
      {
        id: "lmstudio",
        label: "My LM Studio",
        baseUrl: "http://localhost:5555/v1",
        apiKey: "custom-key",
        model: "my-model",
        enabled: false,
      },
    ];
    const result = normalizeProviders(custom);

    // lmstudio should be overridden
    const lm = result.find((p) => p.id === "lmstudio");
    expect(lm?.label).toBe("My LM Studio");
    expect(lm?.baseUrl).toBe("http://localhost:5555/v1");
    expect(lm?.model).toBe("my-model");
    expect(lm?.enabled).toBe(false);

    // openrouter should remain default
    const or = result.find((p) => p.id === "openrouter");
    expect(or?.label).toBe("OpenRouter");
  });

  it("preserves custom provider IDs", () => {
    const custom: ProviderSettings[] = [
      {
        id: "unknown-provider",
        label: "Unknown",
        baseUrl: "http://example.com",
        apiKey: "",
        model: "model",
        enabled: true,
      },
    ];
    const result = normalizeProviders(custom);
    // Defaults stay available and custom providers are appended.
    expect(result).toHaveLength(DEFAULT_PROVIDERS.length + 1);
    expect(result.find((p) => p.id === "unknown-provider")).toMatchObject({
      id: "unknown-provider",
      label: "Unknown",
      baseUrl: "http://example.com",
      model: "model",
      enabled: true,
    });
  });
});

// ── findActiveProvider ──────────────────────────────────────

describe("findActiveProvider", () => {
  const providers: ProviderSettings[] = [
    {
      id: "a",
      label: "A",
      baseUrl: "http://a.com",
      apiKey: "",
      model: "ma",
      enabled: true,
    },
    {
      id: "b",
      label: "B",
      baseUrl: "http://b.com",
      apiKey: "",
      model: "mb",
      enabled: false,
    },
    {
      id: "c",
      label: "C",
      baseUrl: "http://c.com",
      apiKey: "",
      model: "mc",
      enabled: true,
    },
  ];

  it("finds the selected provider when it is enabled", () => {
    expect(findActiveProvider(providers, "a")?.id).toBe("a");
    expect(findActiveProvider(providers, "c")?.id).toBe("c");
  });

  it("skips a disabled selected provider and returns first enabled", () => {
    const result = findActiveProvider(providers, "b");
    expect(result?.id).toBe("a"); // first enabled
  });

  it("falls back to first enabled when selection is unknown", () => {
    const result = findActiveProvider(providers, "nonexistent");
    expect(result?.id).toBe("a");
  });

  it("falls back to first provider when all are disabled", () => {
    const allDisabled = providers.map((p) => ({ ...p, enabled: false }));
    const result = findActiveProvider(allDisabled, "a");
    expect(result?.id).toBe("a"); // providers[0]
  });
});

// ── model cache helpers ────────────────────────────────────

describe("model cache helpers", () => {
  const now = 1_700_000_000_000;
  const models = [
    {
      modelId: "old",
      displayName: "Old",
      isFavorite: false,
      lastSeenAt: now - MODEL_AUTO_REFRESH_MS - 1,
    },
    { modelId: "new", displayName: "New", isFavorite: true, lastSeenAt: now - 25_000 },
  ];
  const agedModels = [
    { modelId: "aged", displayName: "Aged", isFavorite: false, lastSeenAt: now - 90_000 },
  ];

  it("returns the latest sync timestamp", () => {
    expect(getLatestModelSyncAt(models)).toBe(now - 25_000);
    expect(getLatestModelSyncAt(now - 25_000)).toBe(now - 25_000);
  });

  it("detects stale caches after the auto refresh window", () => {
    expect(isModelCacheStale(models, now)).toBe(false);
    expect(
      isModelCacheStale([{ ...models[1], lastSeenAt: now - MODEL_AUTO_REFRESH_MS - 1 }], now),
    ).toBe(true);
    expect(isModelCacheStale(now - MODEL_AUTO_REFRESH_MS - 1, now)).toBe(true);
  });

  it("reports the remaining refresh cooldown", () => {
    expect(getModelRefreshCooldownRemainingMs(models, now)).toBe(
      MODEL_REFRESH_COOLDOWN_MS - 25_000,
    );
    expect(getModelRefreshCooldownRemainingMs(now - 25_000, now)).toBe(
      MODEL_REFRESH_COOLDOWN_MS - 25_000,
    );
  });

  it("formats compact durations and cache age labels", () => {
    expect(formatCompactDuration(9_500)).toBe("10s");
    expect(formatCompactDuration(61_000)).toBe("2m");
    expect(formatModelCacheAge(agedModels, now)).toBe("Cached 2m ago");
    expect(formatModelCacheAge(now - 90_000, now)).toBe("Cached 2m ago");
    expect(formatModelCacheAge([], now)).toBe("No cache yet");
  });
});
