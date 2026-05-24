import type { ProviderModel } from "@/components/settings/utils/providers";

export type ProviderModelCacheEntry = {
  checkedAt: number;
  models: ProviderModel[];
};

const MODEL_CACHE_NAME = "a4chat-model-cache-v1";
const MODEL_CACHE_PREFIX = "/__a4chat__/model-cache";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isProviderModel(value: unknown): value is ProviderModel {
  if (!isRecord(value)) return false;

  return (
    typeof value.modelId === "string" &&
    typeof value.displayName === "string" &&
    typeof value.isFavorite === "boolean" &&
    typeof value.lastSeenAt === "number" &&
    Number.isFinite(value.lastSeenAt)
  );
}

export function serializeProviderModelCache(entry: ProviderModelCacheEntry): string {
  return JSON.stringify(entry);
}

export function parseProviderModelCache(payload: unknown): ProviderModelCacheEntry | null {
  if (!isRecord(payload)) return null;

  const { checkedAt, models } = payload;
  if (typeof checkedAt !== "number" || !Number.isFinite(checkedAt) || !Array.isArray(models)) {
    return null;
  }

  const parsedModels = models.filter(isProviderModel);
  if (parsedModels.length !== models.length) return null;

  return {
    checkedAt: Math.max(0, Math.trunc(checkedAt)),
    models: parsedModels,
  };
}

function canUseCacheStorage() {
  return typeof caches !== "undefined" && typeof Request !== "undefined" && typeof Response !== "undefined";
}

function providerModelCacheRequest(providerId: string) {
  return new Request(`${MODEL_CACHE_PREFIX}/${encodeURIComponent(providerId)}`);
}

export async function loadProviderModelCache(providerId: string): Promise<ProviderModelCacheEntry | null> {
  if (!canUseCacheStorage()) return null;

  try {
    const cache = await caches.open(MODEL_CACHE_NAME);
    const response = await cache.match(providerModelCacheRequest(providerId));
    if (!response) return null;

    const payload = await response.json().catch(() => null);
    return parseProviderModelCache(payload);
  } catch {
    return null;
  }
}

export async function saveProviderModelCache(
  providerId: string,
  models: ProviderModel[],
  checkedAt = Date.now(),
): Promise<void> {
  if (!canUseCacheStorage()) return;

  try {
    const cache = await caches.open(MODEL_CACHE_NAME);
    const entry: ProviderModelCacheEntry = {
      checkedAt: Math.max(0, Math.trunc(checkedAt)),
      models,
    };
    await cache.put(
      providerModelCacheRequest(providerId),
      new Response(serializeProviderModelCache(entry), {
        headers: { "content-type": "application/json" },
      }),
    );
  } catch {
    /* ignore cache write errors */
  }
}
