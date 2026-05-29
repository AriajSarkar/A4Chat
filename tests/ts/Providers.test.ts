import fc from "fast-check";
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
    generateProviderId,
    createBlankProvider,
    type ProviderSettings,
    type ProviderModel,
} from "@/lib/Providers";

// ── providerSchema ──────────────────────────────────────────────

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
        const result = providerSchema.safeParse({ ...VALID_PROVIDER, apiKey: null });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.apiKey).toBe("");
    });

    it("defaults apiKey to empty string when undefined", () => {
        const { apiKey: _, ...without } = VALID_PROVIDER;
        const result = providerSchema.safeParse(without);
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.apiKey).toBe("");
    });

    it("defaults model to empty string when null", () => {
        const result = providerSchema.safeParse({ ...VALID_PROVIDER, model: null });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.model).toBe("");
    });

    it("defaults model to empty string when undefined", () => {
        const { model: _, ...without } = VALID_PROVIDER;
        const result = providerSchema.safeParse(without);
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.model).toBe("");
    });

    it("defaults enabled to true when null", () => {
        const result = providerSchema.safeParse({ ...VALID_PROVIDER, enabled: null });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.enabled).toBe(true);
    });

    it("defaults enabled to true when undefined", () => {
        const { enabled: _, ...without } = VALID_PROVIDER;
        const result = providerSchema.safeParse(without);
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.enabled).toBe(true);
    });

    it("rejects empty id", () => {
        expect(providerSchema.safeParse({ ...VALID_PROVIDER, id: "" }).success).toBe(false);
    });

    it("rejects empty label", () => {
        expect(providerSchema.safeParse({ ...VALID_PROVIDER, label: "" }).success).toBe(false);
    });

    it("rejects invalid URL", () => {
        expect(providerSchema.safeParse({ ...VALID_PROVIDER, baseUrl: "not-a-url" }).success).toBe(
            false,
        );
    });

    it("allows empty model strings for blank providers", () => {
        const result = providerSchema.safeParse({ ...VALID_PROVIDER, model: "" });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.model).toBe("");
    });

    it("allows empty apiKey", () => {
        const result = providerSchema.safeParse({ ...VALID_PROVIDER, apiKey: "" });
        expect(result.success).toBe(true);
    });

    it("rejects missing id entirely", () => {
        const { id: _, ...without } = VALID_PROVIDER;
        expect(providerSchema.safeParse(without).success).toBe(false);
    });

    it("rejects missing label entirely", () => {
        const { label: _, ...without } = VALID_PROVIDER;
        expect(providerSchema.safeParse(without).success).toBe(false);
    });

    it("rejects missing baseUrl entirely", () => {
        const { baseUrl: _, ...without } = VALID_PROVIDER;
        expect(providerSchema.safeParse(without).success).toBe(false);
    });

    it("accepts enabled=false explicitly", () => {
        const result = providerSchema.safeParse({ ...VALID_PROVIDER, enabled: false });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.enabled).toBe(false);
    });
});

// ── normalizeProviders ──────────────────────────────────────────

describe("normalizeProviders", () => {
    it("returns defaults for completely invalid input", () => {
        expect(normalizeProviders("garbage")).toEqual(DEFAULT_PROVIDERS);
    });

    it("returns defaults for null", () => {
        expect(normalizeProviders(null)).toEqual(DEFAULT_PROVIDERS);
    });

    it("returns defaults for undefined", () => {
        expect(normalizeProviders(undefined)).toEqual(DEFAULT_PROVIDERS);
    });

    it("returns defaults for number", () => {
        expect(normalizeProviders(42)).toEqual(DEFAULT_PROVIDERS);
    });

    it("returns defaults for boolean", () => {
        expect(normalizeProviders(true)).toEqual(DEFAULT_PROVIDERS);
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
        const lm = result.find((p) => p.id === "lmstudio");
        expect(lm?.label).toBe("My LM Studio");
        expect(lm?.baseUrl).toBe("http://localhost:5555/v1");
        expect(lm?.model).toBe("my-model");
        expect(lm?.enabled).toBe(false);

        // Other defaults remain
        const or = result.find((p) => p.id === "openrouter");
        expect(or?.label).toBe("OpenRouter");
    });

    it("preserves custom provider IDs appended after defaults", () => {
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
        expect(result).toHaveLength(DEFAULT_PROVIDERS.length + 1);
        expect(result[result.length - 1].id).toBe("unknown-provider");
    });

    it("handles overriding all 4 default providers", () => {
        const overrides = DEFAULT_PROVIDERS.map((d) => ({
            ...d,
            label: `Custom ${d.label}`,
        }));
        const result = normalizeProviders(overrides);
        expect(result).toHaveLength(DEFAULT_PROVIDERS.length);
        for (const p of result) {
            expect(p.label).toMatch(/^Custom /);
        }
    });

    it("returns defaults when array contains invalid entries", () => {
        // If any entry fails schema validation, safeParse fails → defaults
        const input = [
            { id: "", label: "Bad", baseUrl: "not-url", apiKey: "", model: "", enabled: true },
        ];
        expect(normalizeProviders(input)).toEqual(DEFAULT_PROVIDERS);
    });

    it("maintains default provider order", () => {
        const result = normalizeProviders([]);
        const ids = result.map((p) => p.id);
        const defaultIds = DEFAULT_PROVIDERS.map((p) => p.id);
        expect(ids).toEqual(defaultIds);
    });

    it("handles mix of known and unknown provider IDs", () => {
        const custom: ProviderSettings[] = [
            { ...DEFAULT_PROVIDERS[0], label: "Custom LM" },
            {
                id: "my-custom",
                label: "Custom",
                baseUrl: "http://custom.com",
                apiKey: "",
                model: "",
                enabled: true,
            },
        ];
        const result = normalizeProviders(custom);
        expect(result).toHaveLength(DEFAULT_PROVIDERS.length + 1);
        expect(result[0].label).toBe("Custom LM");
        expect(result[result.length - 1].id).toBe("my-custom");
    });
});

// ── findActiveProvider ──────────────────────────────────────────

describe("findActiveProvider", () => {
    const providers: ProviderSettings[] = [
        { id: "a", label: "A", baseUrl: "http://a.com", apiKey: "", model: "ma", enabled: true },
        { id: "b", label: "B", baseUrl: "http://b.com", apiKey: "", model: "mb", enabled: false },
        { id: "c", label: "C", baseUrl: "http://c.com", apiKey: "", model: "mc", enabled: true },
    ];

    it("finds the selected provider when it is enabled", () => {
        expect(findActiveProvider(providers, "a")?.id).toBe("a");
        expect(findActiveProvider(providers, "c")?.id).toBe("c");
    });

    it("skips a disabled selected provider and returns first enabled", () => {
        expect(findActiveProvider(providers, "b")?.id).toBe("a");
    });

    it("falls back to first enabled when selection is unknown", () => {
        expect(findActiveProvider(providers, "nonexistent")?.id).toBe("a");
    });

    it("falls back to first provider when all are disabled", () => {
        const allDisabled = providers.map((p) => ({ ...p, enabled: false }));
        expect(findActiveProvider(allDisabled, "a")?.id).toBe("a");
    });

    it("returns undefined for empty providers array", () => {
        expect(findActiveProvider([], "a")).toBeUndefined();
    });

    it("returns single enabled provider", () => {
        const single = [providers[0]];
        expect(findActiveProvider(single, "a")?.id).toBe("a");
    });

    it("returns single disabled provider (fallback to [0])", () => {
        const single = [{ ...providers[0], enabled: false }];
        expect(findActiveProvider(single, "a")?.id).toBe("a");
    });

    it("selects last enabled provider when selected", () => {
        expect(findActiveProvider(providers, "c")?.id).toBe("c");
    });
});

// ── getLatestModelSyncAt ────────────────────────────────────────

describe("getLatestModelSyncAt", () => {
    const now = 1_700_000_000_000;

    it("returns max lastSeenAt from array of models", () => {
        const models: ProviderModel[] = [
            { modelId: "a", displayName: "A", isFavorite: false, lastSeenAt: now - 100 },
            { modelId: "b", displayName: "B", isFavorite: false, lastSeenAt: now },
            { modelId: "c", displayName: "C", isFavorite: false, lastSeenAt: now - 200 },
        ];
        expect(getLatestModelSyncAt(models)).toBe(now);
    });

    it("returns the timestamp for single model", () => {
        const models: ProviderModel[] = [
            { modelId: "a", displayName: "A", isFavorite: false, lastSeenAt: now },
        ];
        expect(getLatestModelSyncAt(models)).toBe(now);
    });

    it("returns 0 for empty array", () => {
        expect(getLatestModelSyncAt([])).toBe(0);
    });

    it("returns 0 for undefined", () => {
        expect(getLatestModelSyncAt(undefined)).toBe(0);
    });

    it("returns finite number directly", () => {
        expect(getLatestModelSyncAt(now)).toBe(now);
    });

    it("returns 0 for NaN", () => {
        expect(getLatestModelSyncAt(NaN)).toBe(0);
    });

    it("returns 0 for Infinity", () => {
        expect(getLatestModelSyncAt(Infinity)).toBe(0);
    });

    it("returns 0 for -Infinity", () => {
        expect(getLatestModelSyncAt(-Infinity)).toBe(0);
    });

    it("returns negative number as-is (it is finite)", () => {
        expect(getLatestModelSyncAt(-100)).toBe(-100);
    });

    it("returns 0 for 0", () => {
        expect(getLatestModelSyncAt(0)).toBe(0);
    });

    it("returns 0 for array where all lastSeenAt are 0", () => {
        const models: ProviderModel[] = [
            { modelId: "a", displayName: "A", isFavorite: false, lastSeenAt: 0 },
        ];
        expect(getLatestModelSyncAt(models)).toBe(0);
    });
});

// ── getModelRefreshCooldownRemainingMs ───────────────────────────

describe("getModelRefreshCooldownRemainingMs", () => {
    const now = 1_700_000_000_000;

    it("returns full cooldown for just-synced source", () => {
        expect(getModelRefreshCooldownRemainingMs(now, now)).toBe(MODEL_REFRESH_COOLDOWN_MS);
    });

    it("returns 0 for expired cooldown", () => {
        expect(getModelRefreshCooldownRemainingMs(now - MODEL_REFRESH_COOLDOWN_MS - 1, now)).toBe(
            0,
        );
    });

    it("returns 0 at exact boundary", () => {
        expect(getModelRefreshCooldownRemainingMs(now - MODEL_REFRESH_COOLDOWN_MS, now)).toBe(0);
    });

    it("returns partial remaining mid-cooldown", () => {
        const elapsed = 25_000;
        expect(getModelRefreshCooldownRemainingMs(now - elapsed, now)).toBe(
            MODEL_REFRESH_COOLDOWN_MS - elapsed,
        );
    });

    it("returns 0 for lastSeenAt = 0", () => {
        expect(getModelRefreshCooldownRemainingMs(0, now)).toBe(0);
    });

    it("returns 0 for undefined source", () => {
        expect(getModelRefreshCooldownRemainingMs(undefined, now)).toBe(0);
    });

    it("returns 0 for empty array source", () => {
        expect(getModelRefreshCooldownRemainingMs([], now)).toBe(0);
    });

    it("works with model array source", () => {
        const models: ProviderModel[] = [
            { modelId: "a", displayName: "A", isFavorite: false, lastSeenAt: now - 25_000 },
        ];
        expect(getModelRefreshCooldownRemainingMs(models, now)).toBe(
            MODEL_REFRESH_COOLDOWN_MS - 25_000,
        );
    });
});

// ── isModelCacheStale ───────────────────────────────────────────

describe("isModelCacheStale", () => {
    const now = 1_700_000_000_000;

    it("returns false for fresh cache", () => {
        expect(isModelCacheStale(now - 1000, now)).toBe(false);
    });

    it("returns true at exact boundary (>= check)", () => {
        expect(isModelCacheStale(now - MODEL_AUTO_REFRESH_MS, now)).toBe(true);
    });

    it("returns true when way past refresh window", () => {
        expect(isModelCacheStale(now - MODEL_AUTO_REFRESH_MS * 10, now)).toBe(true);
    });

    it("returns false just under boundary", () => {
        expect(isModelCacheStale(now - MODEL_AUTO_REFRESH_MS + 1, now)).toBe(false);
    });

    it("returns true for lastSeenAt = 0", () => {
        expect(isModelCacheStale(0, now)).toBe(true);
    });

    it("returns true for undefined source", () => {
        expect(isModelCacheStale(undefined, now)).toBe(true);
    });

    it("returns true for empty array", () => {
        expect(isModelCacheStale([], now)).toBe(true);
    });

    it("works with model array source", () => {
        const fresh: ProviderModel[] = [
            { modelId: "a", displayName: "A", isFavorite: false, lastSeenAt: now - 1000 },
        ];
        expect(isModelCacheStale(fresh, now)).toBe(false);
    });
});

// ── formatCompactDuration ───────────────────────────────────────

describe("formatCompactDuration", () => {
    it("returns '0s' for 0ms", () => {
        expect(formatCompactDuration(0)).toBe("0s");
    });

    it("returns '1s' for 500ms (ceil)", () => {
        expect(formatCompactDuration(500)).toBe("1s");
    });

    it("returns '1s' for 1ms (ceil)", () => {
        expect(formatCompactDuration(1)).toBe("1s");
    });

    it("returns '1s' for 1000ms", () => {
        expect(formatCompactDuration(1000)).toBe("1s");
    });

    it("returns '59s' for 59000ms", () => {
        expect(formatCompactDuration(59_000)).toBe("59s");
    });

    it("returns '1m' for 60000ms", () => {
        expect(formatCompactDuration(60_000)).toBe("1m");
    });

    it("returns '2m' for 61000ms", () => {
        expect(formatCompactDuration(61_000)).toBe("2m");
    });

    it("returns '10s' for 9500ms (ceil to 10)", () => {
        expect(formatCompactDuration(9_500)).toBe("10s");
    });

    it("returns '60s' for 59001ms (ceil to 60, still < 60s threshold)", () => {
        // Math.ceil(59001/1000) = 60, which is NOT < 60, so it goes to minutes
        // Math.ceil(60/60) = 1m
        expect(formatCompactDuration(59_001)).toBe("1m");
    });

    it("returns '60s' for 59999ms", () => {
        // Math.ceil(59999/1000) = 60, NOT < 60 → minutes
        // Math.ceil(60/60) = 1m
        expect(formatCompactDuration(59_999)).toBe("1m");
    });

    it("returns '1h' for 3600000ms", () => {
        expect(formatCompactDuration(3_600_000)).toBe("1h");
    });

    it("returns '2h' for 7200000ms", () => {
        expect(formatCompactDuration(7_200_000)).toBe("2h");
    });

    it("returns '0s' for negative ms", () => {
        expect(formatCompactDuration(-1000)).toBe("0s");
    });

    it("returns '0s' for large negative ms", () => {
        expect(formatCompactDuration(-999_999)).toBe("0s");
    });

    it("handles very large values in hours", () => {
        // 24 hours = 86_400_000ms
        expect(formatCompactDuration(86_400_000)).toBe("24h");
    });

    // Property-based
    it("property: output always matches /^\\d+(s|m|h)$/", () => {
        fc.assert(
            fc.property(fc.integer({ min: -1_000_000, max: 100_000_000 }), (ms) => {
                const result = formatCompactDuration(ms);
                expect(result).toMatch(/^\d+(s|m|h)$/);
            }),
        );
    });

    it("property: non-negative ms never produces '0s' unless ms ≤ 0", () => {
        fc.assert(
            fc.property(fc.integer({ min: 1, max: 100_000_000 }), (ms) => {
                const result = formatCompactDuration(ms);
                const num = parseInt(result);
                expect(num).toBeGreaterThan(0);
            }),
        );
    });
});

// ── formatModelCacheAge ─────────────────────────────────────────

describe("formatModelCacheAge", () => {
    const now = 1_700_000_000_000;

    it("returns 'No cache yet' for lastSeenAt = 0", () => {
        expect(formatModelCacheAge(0, now)).toBe("No cache yet");
    });

    it("returns 'No cache yet' for undefined", () => {
        expect(formatModelCacheAge(undefined, now)).toBe("No cache yet");
    });

    it("returns 'No cache yet' for empty array", () => {
        expect(formatModelCacheAge([], now)).toBe("No cache yet");
    });

    it("returns 'Cached just now' for < 60s ago", () => {
        expect(formatModelCacheAge(now - 30_000, now)).toBe("Cached just now");
    });

    it("returns 'Cached just now' for 1s ago", () => {
        expect(formatModelCacheAge(now - 1_000, now)).toBe("Cached just now");
    });

    it("returns 'Cached just now' for 59999ms ago", () => {
        expect(formatModelCacheAge(now - 59_999, now)).toBe("Cached just now");
    });

    it("returns 'Cached 1m ago' for exactly 60s ago", () => {
        expect(formatModelCacheAge(now - 60_000, now)).toBe("Cached 1m ago");
    });

    it("returns 'Cached 2m ago' for 90s ago (ceil)", () => {
        expect(formatModelCacheAge(now - 90_000, now)).toBe("Cached 2m ago");
    });

    it("returns 'Cached 30m ago' for 30 min", () => {
        expect(formatModelCacheAge(now - 30 * 60_000, now)).toBe("Cached 30m ago");
    });

    it("returns 'Cached 1h ago' for exactly 1 hour", () => {
        expect(formatModelCacheAge(now - 3_600_000, now)).toBe("Cached 1h ago");
    });

    it("returns 'Cached 2h ago' for 2 hours", () => {
        expect(formatModelCacheAge(now - 7_200_000, now)).toBe("Cached 2h ago");
    });

    it("works with model array source", () => {
        const models: ProviderModel[] = [
            { modelId: "a", displayName: "A", isFavorite: false, lastSeenAt: now - 90_000 },
        ];
        expect(formatModelCacheAge(models, now)).toBe("Cached 2m ago");
    });

    it("works with number source", () => {
        expect(formatModelCacheAge(now - 90_000, now)).toBe("Cached 2m ago");
    });
});

// ── generateProviderId ──────────────────────────────────────────

describe("generateProviderId", () => {
    it("slugifies a normal label", () => {
        expect(generateProviderId("My Provider")).toBe("my-provider");
    });

    it("replaces special characters with hyphens", () => {
        expect(generateProviderId("Hello@World!")).toBe("hello-world");
    });

    it("strips leading hyphens", () => {
        expect(generateProviderId("@hello")).toBe("hello");
    });

    it("strips trailing hyphens", () => {
        expect(generateProviderId("hello@")).toBe("hello");
    });

    it("collapses multiple consecutive special chars to single hyphen", () => {
        expect(generateProviderId("a---b")).toBe("a-b");
        expect(generateProviderId("a!!!b")).toBe("a-b");
    });

    it("preserves numbers", () => {
        expect(generateProviderId("Provider 123")).toBe("provider-123");
    });

    it("lowercases everything", () => {
        expect(generateProviderId("UPPERCASE")).toBe("uppercase");
    });

    it("returns already-lowercase input unchanged", () => {
        expect(generateProviderId("simple")).toBe("simple");
    });

    it("falls back to 'provider-<timestamp>' for empty string", () => {
        const result = generateProviderId("");
        expect(result).toMatch(/^provider-\d+$/);
    });

    it("falls back to 'provider-<timestamp>' for all-special-character input", () => {
        const result = generateProviderId("@#$%^&*!");
        expect(result).toMatch(/^provider-\d+$/);
    });

    it("falls back for whitespace-only input", () => {
        // "   " → toLowerCase → replace non-alnum → "---" → strip leading/trailing → ""
        const result = generateProviderId("   ");
        expect(result).toMatch(/^provider-\d+$/);
    });

    it("strips unicode characters (non a-z0-9)", () => {
        const result = generateProviderId("日本語プロバイダ");
        expect(result).toMatch(/^provider-\d+$/);
    });

    it("handles mixed unicode and ascii", () => {
        expect(generateProviderId("My 日本 Provider")).toBe("my-provider");
    });

    // Property-based: result is never empty
    it("property: result is never an empty string", () => {
        fc.assert(
            fc.property(fc.string(), (label) => {
                const result = generateProviderId(label);
                expect(result.length).toBeGreaterThan(0);
            }),
        );
    });

    // Property-based: result only contains [a-z0-9-]
    it("property: result only contains lowercase alphanumeric and hyphens", () => {
        fc.assert(
            fc.property(fc.string({ minLength: 1 }), (label) => {
                const result = generateProviderId(label);
                // Either matches slug pattern or fallback pattern
                expect(result).toMatch(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$|^provider-\d+$/);
            }),
        );
    });
});

// ── createBlankProvider ─────────────────────────────────────────

describe("createBlankProvider", () => {
    it("uses default label 'New Provider'", () => {
        const provider = createBlankProvider();
        expect(provider.label).toBe("New Provider");
    });

    it("uses custom label", () => {
        const provider = createBlankProvider("My Custom");
        expect(provider.label).toBe("My Custom");
    });

    it("generates an ID containing the slugified label", () => {
        const provider = createBlankProvider("Test Provider");
        expect(provider.id).toMatch(/^test-provider-[0-9a-f-]{36}$/i);
    });

    it("ID contains a UUID suffix", () => {
        const provider = createBlankProvider("Test");
        const match = provider.id.match(/-([0-9a-f-]{36})$/i);
        expect(match).not.toBeNull();
    });

    it("sets default baseUrl", () => {
        expect(createBlankProvider().baseUrl).toBe("http://localhost:1234/v1");
    });

    it("sets empty apiKey", () => {
        expect(createBlankProvider().apiKey).toBe("");
    });

    it("sets empty model", () => {
        expect(createBlankProvider().model).toBe("");
    });

    it("sets enabled to false", () => {
        expect(createBlankProvider().enabled).toBe(false);
    });

    it("two calls produce different IDs", () => {
        const a = createBlankProvider();
        const b = createBlankProvider();
        expect(a.id).not.toBe(b.id);
    });

    it("returned provider passes schema validation", () => {
        const provider = createBlankProvider("Valid Provider");
        const result = providerSchema.safeParse(provider);
        expect(result.success).toBe(true);
    });

    it("handles empty label string", () => {
        const provider = createBlankProvider("");
        expect(provider.label).toBe("");
        // ID falls back to provider-<timestamp>-<UUID>
        expect(provider.id).toMatch(/^provider-\d+-[0-9a-f-]{36}$/i);
    });
});
