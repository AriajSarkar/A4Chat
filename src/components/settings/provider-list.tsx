"use client";

import { memo, useCallback } from "react";
import { RiAddLine } from "@remixicon/react";

import { ProviderCard } from "@/components/settings/provider-card";
import type { ProviderSettings } from "@/components/settings/utils/providers";
import { createBlankProvider, DEFAULT_PROVIDERS } from "@/components/settings/utils/providers";

type ProviderListProps = {
  providers: ProviderSettings[];
  onUpdateProvider: (providerId: string, patch: Partial<ProviderSettings>) => void;
  onAddProvider: (provider: ProviderSettings) => void;
  onDeleteProvider: (providerId: string) => void;
};

const DEFAULT_IDS = new Set(DEFAULT_PROVIDERS.map((p) => p.id));

export const ProviderList = memo(function ProviderList({
  providers,
  onUpdateProvider,
  onAddProvider,
  onDeleteProvider,
}: ProviderListProps) {
  const handleAddProvider = useCallback(() => {
    onAddProvider(createBlankProvider());
  }, [onAddProvider]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-text-quaternary">
          Providers
        </span>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
            onClick={handleAddProvider}
            type="button"
          >
            <RiAddLine size={14} />
            Add
          </button>
        </div>
      </div>

      {/* Provider cards */}
      {providers.map((provider) => (
        <ProviderCard
          isDefault={DEFAULT_IDS.has(provider.id)}
          key={provider.id}
          onDelete={() => onDeleteProvider(provider.id)}
          onUpdate={(patch) => onUpdateProvider(provider.id, patch)}
          provider={provider}
        />
      ))}
    </div>
  );
});
