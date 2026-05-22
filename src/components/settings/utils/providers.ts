import { z } from "zod";

export const providerSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  baseUrl: z.string().url(),
  apiKey: z.preprocess((value) => value ?? "", z.string()),
  model: z.string().min(1),
  enabled: z.preprocess((value) => value ?? true, z.boolean()),
});

export type ProviderSettings = z.infer<typeof providerSchema>;

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
];

export function normalizeProviders(value: unknown): ProviderSettings[] {
  const parsed = z.array(providerSchema).safeParse(value);

  if (!parsed.success) {
    return DEFAULT_PROVIDERS;
  }

  const byId = new Map(parsed.data.map((provider) => [provider.id, provider]));

  return DEFAULT_PROVIDERS.map((fallback) => byId.get(fallback.id) ?? fallback);
}

export function findActiveProvider(providers: ProviderSettings[], selectedProviderId: string) {
  return (
    providers.find((provider) => provider.id === selectedProviderId && provider.enabled) ??
    providers.find((provider) => provider.enabled) ??
    providers[0]
  );
}
