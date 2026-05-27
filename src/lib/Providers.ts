import { z } from "zod";

/* ── Provider Model ─────────────────────────────────────── */

export type ProviderModel = {
  modelId: string;
  displayName: string;
  isFavorite: boolean;
  lastSeenAt: number;
};

/* ── Provider Settings ──────────────────────────────────── */

export const providerSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  baseUrl: z.string().url(),
  apiKey: z.preprocess((value) => value ?? "", z.string()),
  model: z.preprocess((value) => value ?? "", z.string()),
  enabled: z.preprocess((value) => value ?? true, z.boolean()),
});

export type ProviderSettings = z.infer<typeof providerSchema>;

type ModelCacheSource = ProviderModel[] | number | undefined;

/* ── Defaults ───────────────────────────────────────────── */

export const DEFAULT_PROVIDERS: ProviderSettings[] = [
  {
    id: "lmstudio",
    label: "LM Studio",
    baseUrl: "http://localhost:1234/v1",
    apiKey: "",
    model: "local-model",
    enabled: true,
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: "",
    model: "openrouter/auto",
    enabled: true,
  },
  {
    id: "google-gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com",
    apiKey: "",
    model: "gemini-2.5-flash",
    enabled: false,
  },
  {
    id: "comfyui",
    label: "ComfyUI",
    baseUrl: "http://127.0.0.1:8188",
    apiKey: "",
    model: "",
    enabled: false,
  },
];

/* ── Helpers ────────────────────────────────────────────── */

export function normalizeProviders(value: unknown): ProviderSettings[] {
  const parsed = z.array(providerSchema).safeParse(value);

  if (!parsed.success) {
    return DEFAULT_PROVIDERS;
  }

  const byId = new Map(parsed.data.map((provider) => [provider.id, provider]));

  /* Merge user-saved providers with defaults; append any custom providers */
  const merged = DEFAULT_PROVIDERS.map((fallback) => byId.get(fallback.id) ?? fallback);
  const customProviders = parsed.data.filter((p) => !DEFAULT_PROVIDERS.some((d) => d.id === p.id));

  return [...merged, ...customProviders];
}

export function findActiveProvider(providers: ProviderSettings[], selectedProviderId: string) {
  return (
    providers.find((provider) => provider.id === selectedProviderId && provider.enabled) ??
    providers.find((provider) => provider.enabled) ??
    providers[0]
  );
}

export const MODEL_AUTO_REFRESH_MS = 60 * 60 * 1000;
export const MODEL_REFRESH_COOLDOWN_MS = 60 * 1000;

export function getLatestModelSyncAt(source: ModelCacheSource) {
  if (typeof source === "number") {
    return Number.isFinite(source) ? source : 0;
  }

  return source?.reduce((latest, model) => Math.max(latest, model.lastSeenAt), 0) ?? 0;
}

export function getModelRefreshCooldownRemainingMs(source: ModelCacheSource, now = Date.now()) {
  const lastSeenAt = getLatestModelSyncAt(source);
  if (!lastSeenAt) return 0;
  return Math.max(0, MODEL_REFRESH_COOLDOWN_MS - (now - lastSeenAt));
}

export function isModelCacheStale(source: ModelCacheSource, now = Date.now()) {
  const lastSeenAt = getLatestModelSyncAt(source);
  return !lastSeenAt || now - lastSeenAt >= MODEL_AUTO_REFRESH_MS;
}

export function formatCompactDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const totalMinutes = Math.ceil(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;

  const totalHours = Math.ceil(totalMinutes / 60);
  return `${totalHours}h`;
}

export function formatModelCacheAge(source: ModelCacheSource, now = Date.now()) {
  const lastSeenAt = getLatestModelSyncAt(source);
  if (!lastSeenAt) return "No cache yet";

  const ageMs = now - lastSeenAt;
  if (ageMs < 60_000) return "Cached just now";
  if (ageMs < 3_600_000) return `Cached ${Math.ceil(ageMs / 60_000)}m ago`;
  return `Cached ${Math.ceil(ageMs / 3_600_000)}h ago`;
}

/** Generate a slugified provider ID from a label */
export function generateProviderId(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `provider-${Date.now()}`
  );
}

/** Create a blank provider template for "Add Provider" */
export function createBlankProvider(label = "New Provider"): ProviderSettings {
  return {
    id: generateProviderId(label) + `-${Date.now()}`,
    label,
    baseUrl: "http://localhost:1234/v1",
    apiKey: "",
    model: "",
    enabled: false,
  };
}
