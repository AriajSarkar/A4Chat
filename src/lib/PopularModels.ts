import type { ProviderModel } from "@/lib/Providers";

/**
 * Well-known models for popular providers.
 * These are used as initial cache when no models have been detected yet,
 * giving users immediate options without needing to hit the API first.
 */

const OPENROUTER_POPULAR: ProviderModel[] = [
    /* Free tier */
    {
        modelId: "openrouter/auto",
        displayName: "Auto (best available)",
        isFavorite: false,
        lastSeenAt: 0,
    },
    {
        modelId: "meta-llama/llama-4-scout",
        displayName: "Llama 4 Scout",
        isFavorite: false,
        lastSeenAt: 0,
    },
    {
        modelId: "meta-llama/llama-4-maverick",
        displayName: "Llama 4 Maverick",
        isFavorite: false,
        lastSeenAt: 0,
    },
    {
        modelId: "google/gemma-3-27b-it:free",
        displayName: "Gemma 3 27B (free)",
        isFavorite: false,
        lastSeenAt: 0,
    },
    {
        modelId: "deepseek/deepseek-chat-v3-0324:free",
        displayName: "DeepSeek V3 (free)",
        isFavorite: false,
        lastSeenAt: 0,
    },
    {
        modelId: "qwen/qwen3-235b-a22b:free",
        displayName: "Qwen 3 235B (free)",
        isFavorite: false,
        lastSeenAt: 0,
    },
    {
        modelId: "mistralai/mistral-small-3.1-24b-instruct:free",
        displayName: "Mistral Small 3.1 (free)",
        isFavorite: false,
        lastSeenAt: 0,
    },

    /* Paid — high quality */
    { modelId: "openai/gpt-4.1", displayName: "GPT-4.1", isFavorite: false, lastSeenAt: 0 },
    {
        modelId: "openai/gpt-4.1-mini",
        displayName: "GPT-4.1 Mini",
        isFavorite: false,
        lastSeenAt: 0,
    },
    { modelId: "openai/o4-mini", displayName: "o4 Mini", isFavorite: false, lastSeenAt: 0 },
    {
        modelId: "anthropic/claude-sonnet-4",
        displayName: "Claude Sonnet 4",
        isFavorite: false,
        lastSeenAt: 0,
    },
    {
        modelId: "anthropic/claude-3.5-haiku",
        displayName: "Claude 3.5 Haiku",
        isFavorite: false,
        lastSeenAt: 0,
    },
    {
        modelId: "google/gemini-2.5-flash-preview",
        displayName: "Gemini 2.5 Flash",
        isFavorite: false,
        lastSeenAt: 0,
    },
    {
        modelId: "google/gemini-2.5-pro-preview",
        displayName: "Gemini 2.5 Pro",
        isFavorite: false,
        lastSeenAt: 0,
    },
    {
        modelId: "deepseek/deepseek-r1",
        displayName: "DeepSeek R1",
        isFavorite: false,
        lastSeenAt: 0,
    },
    {
        modelId: "deepseek/deepseek-chat-v3-0324",
        displayName: "DeepSeek V3",
        isFavorite: false,
        lastSeenAt: 0,
    },
    {
        modelId: "qwen/qwen3-235b-a22b",
        displayName: "Qwen 3 235B",
        isFavorite: false,
        lastSeenAt: 0,
    },
];

const LM_STUDIO_POPULAR: ProviderModel[] = [
    {
        modelId: "local-model",
        displayName: "Default local model",
        isFavorite: false,
        lastSeenAt: 0,
    },
];

const COMFYUI_POPULAR: ProviderModel[] = [
    {
        modelId: "default-workflow",
        displayName: "Default Text-to-Image",
        isFavorite: false,
        lastSeenAt: 0,
    },
];

const SEED_MAP: Record<string, ProviderModel[]> = {
    openrouter: OPENROUTER_POPULAR,
    lmstudio: LM_STUDIO_POPULAR,
    comfyui: COMFYUI_POPULAR,
};

/**
 * Returns seed models for a known provider.
 * Used as initial display before the API is queried.
 */
export function getSeedModels(providerId: string): ProviderModel[] {
    return Object.hasOwn(SEED_MAP, providerId) ? SEED_MAP[providerId] : [];
}

/**
 * Merge detected models with seed models.
 * Detected models take priority; seeds fill in any gaps.
 */
export function mergeWithSeeds(providerId: string, detected: ProviderModel[]): ProviderModel[] {
    if (detected.length > 0) return detected;
    return getSeedModels(providerId);
}
