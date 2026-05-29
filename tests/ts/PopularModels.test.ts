import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { getSeedModels, mergeWithSeeds } from "@/lib/PopularModels";

// ── getSeedModels ───────────────────────────────────────────────

describe("getSeedModels", () => {
    it("returns models for 'openrouter'", () => {
        const models = getSeedModels("openrouter");
        expect(models.length).toBeGreaterThan(0);
        expect(models[0].modelId).toBeDefined();
        expect(models[0].displayName).toBeDefined();
    });

    it("returns models for 'lmstudio'", () => {
        const models = getSeedModels("lmstudio");
        expect(models.length).toBeGreaterThan(0);
        expect(models[0].modelId).toBe("local-model");
    });

    it("returns models for 'comfyui'", () => {
        const models = getSeedModels("comfyui");
        expect(models.length).toBeGreaterThan(0);
        expect(models[0].modelId).toBe("default-workflow");
    });

    it("returns empty array for unknown provider", () => {
        expect(getSeedModels("unknown-provider")).toEqual([]);
    });

    it("returns empty array for empty string", () => {
        expect(getSeedModels("")).toEqual([]);
    });

    it("returns empty array for provider with wrong case", () => {
        // SEED_MAP keys are lowercase — "OpenRouter" won't match
        expect(getSeedModels("OpenRouter")).toEqual([]);
    });

    it("all openrouter seed models have required ProviderModel fields", () => {
        const models = getSeedModels("openrouter");
        for (const model of models) {
            expect(typeof model.modelId).toBe("string");
            expect(model.modelId.length).toBeGreaterThan(0);
            expect(typeof model.displayName).toBe("string");
            expect(model.displayName.length).toBeGreaterThan(0);
            expect(typeof model.isFavorite).toBe("boolean");
            expect(typeof model.lastSeenAt).toBe("number");
            expect(Number.isFinite(model.lastSeenAt)).toBe(true);
        }
    });

    it("all seed models have isFavorite set to false", () => {
        for (const providerId of ["openrouter", "lmstudio", "comfyui"]) {
            const models = getSeedModels(providerId);
            for (const model of models) {
                expect(model.isFavorite).toBe(false);
            }
        }
    });

    it("all seed models have lastSeenAt set to 0", () => {
        for (const providerId of ["openrouter", "lmstudio", "comfyui"]) {
            const models = getSeedModels(providerId);
            for (const model of models) {
                expect(model.lastSeenAt).toBe(0);
            }
        }
    });

    it("openrouter has both free and paid models", () => {
        const models = getSeedModels("openrouter");
        const freeModels = models.filter((m) => m.modelId.includes(":free"));
        const paidModels = models.filter((m) => !m.modelId.includes(":free"));
        expect(freeModels.length).toBeGreaterThan(0);
        expect(paidModels.length).toBeGreaterThan(0);
    });

    it("all model IDs within a provider are unique", () => {
        for (const providerId of ["openrouter", "lmstudio", "comfyui"]) {
            const models = getSeedModels(providerId);
            const ids = models.map((m) => m.modelId);
            expect(new Set(ids).size).toBe(ids.length);
        }
    });

    // Property-based: result is always an array
    it("always returns an array for any string input", () => {
        fc.assert(
            fc.property(fc.string(), (providerId) => {
                const result = getSeedModels(providerId);
                expect(Array.isArray(result)).toBe(true);
            }),
        );
    });
});

// ── mergeWithSeeds ──────────────────────────────────────────────

describe("mergeWithSeeds", () => {
    const detectedModels = [
        {
            modelId: "detected-model-1",
            displayName: "Detected 1",
            isFavorite: false,
            lastSeenAt: 1_700_000_000_000,
        },
        {
            modelId: "detected-model-2",
            displayName: "Detected 2",
            isFavorite: true,
            lastSeenAt: 1_700_000_000_000,
        },
    ];

    it("returns detected models when detected array is non-empty", () => {
        const result = mergeWithSeeds("openrouter", detectedModels);
        expect(result).toBe(detectedModels); // exact same reference
    });

    it("returns seed models when detected array is empty for known provider", () => {
        const result = mergeWithSeeds("openrouter", []);
        expect(result.length).toBeGreaterThan(0);
        expect(result).toEqual(getSeedModels("openrouter"));
    });

    it("returns empty array when detected is empty and provider is unknown", () => {
        const result = mergeWithSeeds("unknown-provider", []);
        expect(result).toEqual([]);
    });

    it("ignores seeds entirely when detected has even one model", () => {
        const singleDetected = [
            {
                modelId: "single",
                displayName: "Single",
                isFavorite: false,
                lastSeenAt: Date.now(),
            },
        ];
        const result = mergeWithSeeds("openrouter", singleDetected);
        expect(result).toEqual(singleDetected);
        // Should NOT contain any seed models
        expect(result.length).toBe(1);
    });

    it("returns lmstudio seeds for empty detected array", () => {
        const result = mergeWithSeeds("lmstudio", []);
        expect(result.length).toBe(1);
        expect(result[0].modelId).toBe("local-model");
    });

    it("returns comfyui seeds for empty detected array", () => {
        const result = mergeWithSeeds("comfyui", []);
        expect(result.length).toBe(1);
        expect(result[0].modelId).toBe("default-workflow");
    });

    it("is idempotent: merging detected always returns detected", () => {
        const first = mergeWithSeeds("openrouter", detectedModels);
        const second = mergeWithSeeds("openrouter", first);
        expect(second).toBe(first); // same reference since first.length > 0
    });

    // Property-based: result is always an array (either detected or seeds)
    it("always returns an array", () => {
        fc.assert(
            fc.property(fc.string(), (providerId) => {
                const result = mergeWithSeeds(providerId, []);
                expect(Array.isArray(result)).toBe(true);
            }),
        );
    });
});
