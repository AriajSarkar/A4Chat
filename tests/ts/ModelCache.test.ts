import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
    parseProviderModelCache,
    serializeProviderModelCache,
    type ProviderModelCacheEntry,
} from "@/lib/ModelCache";
import type { ProviderModel } from "@/lib/Providers";

// ── Helpers ─────────────────────────────────────────────────────

function validModel(overrides: Partial<ProviderModel> = {}): ProviderModel {
    return {
        modelId: "openai/gpt-4o-mini",
        displayName: "GPT-4o mini",
        isFavorite: true,
        lastSeenAt: 1_725_000_000_000,
        ...overrides,
    };
}

function validEntry(overrides: Partial<ProviderModelCacheEntry> = {}): ProviderModelCacheEntry {
    return {
        checkedAt: 1_725_000_000_000,
        models: [validModel()],
        ...overrides,
    };
}

// ── serializeProviderModelCache ─────────────────────────────────

describe("serializeProviderModelCache", () => {
    it("serializes to JSON.stringify equivalent", () => {
        const entry = validEntry();
        expect(serializeProviderModelCache(entry)).toBe(JSON.stringify(entry));
    });

    it("serializes entry with empty models array", () => {
        const entry = validEntry({ models: [] });
        expect(serializeProviderModelCache(entry)).toBe(JSON.stringify(entry));
    });

    it("serializes entry with multiple models", () => {
        const entry = validEntry({
            models: [
                validModel({ modelId: "m1" }),
                validModel({ modelId: "m2" }),
                validModel({ modelId: "m3" }),
            ],
        });
        const result = JSON.parse(serializeProviderModelCache(entry));
        expect(result.models).toHaveLength(3);
    });

    it("serializes model with special characters in displayName", () => {
        const entry = validEntry({
            models: [validModel({ displayName: 'GPT-4o "mini" <best>' })],
        });
        const result = JSON.parse(serializeProviderModelCache(entry));
        expect(result.models[0].displayName).toBe('GPT-4o "mini" <best>');
    });

    it("serializes checkedAt as-is (no clamping in serialize)", () => {
        const entry = validEntry({ checkedAt: -100 });
        const result = JSON.parse(serializeProviderModelCache(entry));
        expect(result.checkedAt).toBe(-100);
    });
});

// ── parseProviderModelCache ─────────────────────────────────────

describe("parseProviderModelCache", () => {
    // ── Valid inputs ────────────────────────────────────────────

    it("parses valid cache payload", () => {
        const entry = validEntry();
        expect(parseProviderModelCache(entry)).toEqual(entry);
    });

    it("parses entry with empty models array", () => {
        const result = parseProviderModelCache({ checkedAt: 1_000, models: [] });
        expect(result).toEqual({ checkedAt: 1_000, models: [] });
    });

    it("parses entry with multiple valid models", () => {
        const models = [validModel({ modelId: "a" }), validModel({ modelId: "b" })];
        const result = parseProviderModelCache({ checkedAt: 1_000, models });
        expect(result?.models).toHaveLength(2);
    });

    // ── checkedAt edge cases ────────────────────────────────────

    it("truncates fractional checkedAt", () => {
        const result = parseProviderModelCache({ checkedAt: 1_000.7, models: [] });
        expect(result?.checkedAt).toBe(1_000);
    });

    it("clamps negative checkedAt to 0", () => {
        const result = parseProviderModelCache({ checkedAt: -500, models: [] });
        expect(result?.checkedAt).toBe(0);
    });

    it("clamps negative fractional checkedAt to 0", () => {
        const result = parseProviderModelCache({ checkedAt: -0.5, models: [] });
        expect(result?.checkedAt).toBe(0);
    });

    it("accepts zero checkedAt", () => {
        const result = parseProviderModelCache({ checkedAt: 0, models: [] });
        expect(result?.checkedAt).toBe(0);
    });

    it("rejects NaN checkedAt", () => {
        expect(parseProviderModelCache({ checkedAt: NaN, models: [] })).toBeNull();
    });

    it("rejects Infinity checkedAt", () => {
        expect(parseProviderModelCache({ checkedAt: Infinity, models: [] })).toBeNull();
    });

    it("rejects -Infinity checkedAt", () => {
        expect(parseProviderModelCache({ checkedAt: -Infinity, models: [] })).toBeNull();
    });

    it("rejects string checkedAt", () => {
        expect(parseProviderModelCache({ checkedAt: "now", models: [] })).toBeNull();
    });

    it("rejects boolean checkedAt", () => {
        expect(parseProviderModelCache({ checkedAt: true, models: [] })).toBeNull();
    });

    it("rejects null checkedAt", () => {
        expect(parseProviderModelCache({ checkedAt: null, models: [] })).toBeNull();
    });

    it("rejects undefined checkedAt", () => {
        expect(parseProviderModelCache({ checkedAt: undefined, models: [] })).toBeNull();
    });

    // ── models array edge cases ─────────────────────────────────

    it("rejects models as a non-array (object)", () => {
        expect(parseProviderModelCache({ checkedAt: 1_000, models: {} })).toBeNull();
    });

    it("rejects models as a string", () => {
        expect(parseProviderModelCache({ checkedAt: 1_000, models: "[]" })).toBeNull();
    });

    it("rejects models as null", () => {
        expect(parseProviderModelCache({ checkedAt: 1_000, models: null })).toBeNull();
    });

    // ── Model validation (strict: ALL must pass) ────────────────

    it("rejects if any model has missing modelId", () => {
        const badModel = { displayName: "X", isFavorite: false, lastSeenAt: 0 };
        expect(parseProviderModelCache({ checkedAt: 1_000, models: [badModel] })).toBeNull();
    });

    it("rejects if any model has non-string modelId", () => {
        const badModel = { modelId: 123, displayName: "X", isFavorite: false, lastSeenAt: 0 };
        expect(parseProviderModelCache({ checkedAt: 1_000, models: [badModel] })).toBeNull();
    });

    it("rejects if any model has missing displayName", () => {
        const badModel = { modelId: "x", isFavorite: false, lastSeenAt: 0 };
        expect(parseProviderModelCache({ checkedAt: 1_000, models: [badModel] })).toBeNull();
    });

    it("rejects if any model has non-boolean isFavorite", () => {
        const badModel = { modelId: "x", displayName: "X", isFavorite: "yes", lastSeenAt: 0 };
        expect(parseProviderModelCache({ checkedAt: 1_000, models: [badModel] })).toBeNull();
    });

    it("rejects if any model has non-number lastSeenAt", () => {
        const badModel = { modelId: "x", displayName: "X", isFavorite: false, lastSeenAt: "nope" };
        expect(parseProviderModelCache({ checkedAt: 1_000, models: [badModel] })).toBeNull();
    });

    it("rejects if any model has NaN lastSeenAt", () => {
        const badModel = { modelId: "x", displayName: "X", isFavorite: false, lastSeenAt: NaN };
        expect(parseProviderModelCache({ checkedAt: 1_000, models: [badModel] })).toBeNull();
    });

    it("rejects if any model has Infinity lastSeenAt", () => {
        const badModel = {
            modelId: "x",
            displayName: "X",
            isFavorite: false,
            lastSeenAt: Infinity,
        };
        expect(parseProviderModelCache({ checkedAt: 1_000, models: [badModel] })).toBeNull();
    });

    it("rejects mixed valid/invalid models (strict validation)", () => {
        const good = validModel();
        const bad = { modelId: "x", displayName: "X", isFavorite: false, lastSeenAt: NaN };
        expect(parseProviderModelCache({ checkedAt: 1_000, models: [good, bad] })).toBeNull();
    });

    it("accepts model with extra fields (extra fields ignored by type guard)", () => {
        const model = { ...validModel(), extraField: "hello", anotherField: 42 };
        const result = parseProviderModelCache({ checkedAt: 1_000, models: [model] });
        expect(result).not.toBeNull();
        expect(result?.models).toHaveLength(1);
    });

    it("accepts model with lastSeenAt = 0", () => {
        const result = parseProviderModelCache({
            checkedAt: 1_000,
            models: [validModel({ lastSeenAt: 0 })],
        });
        expect(result?.models[0].lastSeenAt).toBe(0);
    });

    // ── Top-level payload rejection ─────────────────────────────

    it("rejects null payload", () => {
        expect(parseProviderModelCache(null)).toBeNull();
    });

    it("rejects undefined payload", () => {
        expect(parseProviderModelCache(undefined)).toBeNull();
    });

    it("rejects number payload", () => {
        expect(parseProviderModelCache(42)).toBeNull();
    });

    it("rejects string payload", () => {
        expect(parseProviderModelCache("hello")).toBeNull();
    });

    it("rejects boolean payload", () => {
        expect(parseProviderModelCache(true)).toBeNull();
    });

    it("rejects empty object payload", () => {
        expect(parseProviderModelCache({})).toBeNull();
    });

    it("rejects array payload (arrays are objects but not records for this purpose)", () => {
        // isRecord returns true for arrays, but checkedAt/models checks will fail
        expect(parseProviderModelCache([1, 2, 3])).toBeNull();
    });

    // ── Round-trip property ─────────────────────────────────────

    it("round-trips: parse(JSON.parse(serialize(entry))) === entry", () => {
        const entry = validEntry();
        const serialized = serializeProviderModelCache(entry);
        const parsed = JSON.parse(serialized);
        const result = parseProviderModelCache(parsed);
        expect(result).toEqual(entry);
    });

    // Property-based: valid entries round-trip
    it("property: valid entries survive serialize → parse round-trip", () => {
        fc.assert(
            fc.property(
                fc.record({
                    checkedAt: fc.nat({ max: 2_000_000_000_000 }),
                    models: fc.array(
                        fc.record({
                            modelId: fc.string({ minLength: 1 }),
                            displayName: fc.string({ minLength: 1 }),
                            isFavorite: fc.boolean(),
                            lastSeenAt: fc.nat({ max: 2_000_000_000_000 }),
                        }),
                        { maxLength: 5 },
                    ),
                }),
                (entry) => {
                    const serialized = serializeProviderModelCache(entry);
                    const deserialized = JSON.parse(serialized);
                    const result = parseProviderModelCache(deserialized);
                    expect(result).not.toBeNull();
                    expect(result!.checkedAt).toBe(entry.checkedAt);
                    expect(result!.models.length).toBe(entry.models.length);
                },
            ),
        );
    });

    // Property-based: non-record payloads always return null
    it("property: non-object payloads always return null", () => {
        fc.assert(
            fc.property(
                fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
                (payload) => {
                    expect(parseProviderModelCache(payload)).toBeNull();
                },
            ),
        );
    });
});

// ── Cache API Mocks & Tests ─────────────────────────────────────

import { vi, afterEach } from "vitest";

import { loadProviderModelCache, saveProviderModelCache } from "@/lib/ModelCache";

describe("load/save ProviderModelCache (Cache API)", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("returns null if caches is undefined", async () => {
        vi.stubGlobal("caches", undefined);
        vi.stubGlobal("Request", class {});
        vi.stubGlobal("Response", class {});
        expect(await loadProviderModelCache("test")).toBeNull();

        // save returns void, should not throw
        await expect(saveProviderModelCache("test", [])).resolves.toBeUndefined();
    });

    it("returns null if Request is undefined", async () => {
        vi.stubGlobal("caches", {});
        vi.stubGlobal("Request", undefined);
        vi.stubGlobal("Response", class {});
        expect(await loadProviderModelCache("test")).toBeNull();
    });

    it("returns null if Response is undefined", async () => {
        vi.stubGlobal("caches", {});
        vi.stubGlobal("Request", class {});
        vi.stubGlobal("Response", undefined);
        expect(await loadProviderModelCache("test")).toBeNull();
    });

    it("load returns null on caches.open error", async () => {
        vi.stubGlobal(
            "Request",
            class Request {
                constructor() {}
            },
        );
        vi.stubGlobal("Response", class Response {});
        vi.stubGlobal("caches", {
            open: vi.fn().mockRejectedValue(new Error("Network error")),
        });
        expect(await loadProviderModelCache("test")).toBeNull();
    });

    it("load returns null if no match found", async () => {
        const mockCache = { match: vi.fn().mockResolvedValue(undefined) };
        vi.stubGlobal(
            "Request",
            class Request {
                constructor() {}
            },
        );
        vi.stubGlobal("Response", class Response {});
        vi.stubGlobal("caches", { open: vi.fn().mockResolvedValue(mockCache) });

        expect(await loadProviderModelCache("test")).toBeNull();
    });

    it("load returns parsed entry on success", async () => {
        const payload = validEntry();
        const mockResponse = { json: vi.fn().mockResolvedValue(payload) };
        const mockCache = { match: vi.fn().mockResolvedValue(mockResponse) };

        vi.stubGlobal(
            "Request",
            class Request {
                constructor(public url: string) {}
            },
        );
        vi.stubGlobal("Response", class Response {});
        vi.stubGlobal("caches", { open: vi.fn().mockResolvedValue(mockCache) });

        const result = await loadProviderModelCache("test");
        expect(result).toEqual(payload);
    });

    it("load returns null if json parsing fails", async () => {
        const mockResponse = { json: vi.fn().mockRejectedValue(new Error("JSON error")) };
        const mockCache = { match: vi.fn().mockResolvedValue(mockResponse) };

        vi.stubGlobal(
            "Request",
            class Request {
                constructor() {}
            },
        );
        vi.stubGlobal("Response", class Response {});
        vi.stubGlobal("caches", { open: vi.fn().mockResolvedValue(mockCache) });

        expect(await loadProviderModelCache("test")).toBeNull();
    });

    it("save puts entry in cache", async () => {
        const mockCache = { put: vi.fn().mockResolvedValue(undefined) };

        vi.stubGlobal(
            "Request",
            class Request {
                constructor(public url: string) {}
            },
        );
        vi.stubGlobal(
            "Response",
            class Response {
                constructor(
                    public body: any,
                    public init: any,
                ) {}
            },
        );
        vi.stubGlobal("caches", { open: vi.fn().mockResolvedValue(mockCache) });

        await saveProviderModelCache("test", [], 1_000);

        expect(mockCache.put).toHaveBeenCalled();
    });

    it("save ignores cache write errors silently", async () => {
        const mockCache = { put: vi.fn().mockRejectedValue(new Error("Storage full")) };

        vi.stubGlobal(
            "Request",
            class Request {
                constructor() {}
            },
        );
        vi.stubGlobal(
            "Response",
            class Response {
                constructor() {}
            },
        );
        vi.stubGlobal("caches", { open: vi.fn().mockResolvedValue(mockCache) });

        await expect(saveProviderModelCache("test", [])).resolves.toBeUndefined();
    });
});
