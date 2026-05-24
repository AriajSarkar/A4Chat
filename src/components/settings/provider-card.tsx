"use client";

import { memo, useCallback, useState } from "react";
import {
  RiArrowDownSLine,
  RiDeleteBinLine,
  RiEyeLine,
  RiEyeOffLine,
} from "@remixicon/react";
import { AnimatePresence, motion } from "motion/react";

import { Field } from "@/components/settings/field";
import { ProviderIcon } from "@/components/settings/provider-icon";
import type { ProviderSettings } from "@/components/settings/utils/providers";
import { cn } from "@/lib/cn";

type ProviderCardProps = {
  provider: ProviderSettings;
  isDefault: boolean;
  onUpdate: (patch: Partial<ProviderSettings>) => void;
  onDelete: () => void;
};

export const ProviderCard = memo(function ProviderCard({
  provider,
  isDefault,
  onUpdate,
  onDelete,
}: ProviderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const statusText = provider.enabled
    ? provider.model
      ? provider.apiKey
        ? "Authenticated"
        : "Connected (no key)"
      : "Model not set"
    : "Disabled";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border transition-colors duration-200",
        provider.enabled
          ? "border-white/8 bg-surface-0/60"
          : "border-white/4 bg-surface-0/30",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4 sm:py-3.5 md:px-5 md:py-4">
        <ProviderIcon providerId={provider.id} size={28} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-text-primary md:text-base">
              {provider.label}
            </h3>
          </div>
          <p
            className={cn(
              "truncate text-xs",
              provider.enabled ? "text-text-tertiary" : "text-text-quaternary",
            )}
          >
            {statusText}
          </p>
        </div>

        {/* Expand toggle */}
        <button
          aria-label={expanded ? "Collapse" : "Expand"}
          className="grid size-7 shrink-0 place-items-center rounded-lg text-text-quaternary transition-colors hover:bg-white/6 hover:text-text-secondary sm:size-8"
          onClick={() => setExpanded((v) => !v)}
          type="button"
        >
          <RiArrowDownSLine
            className={cn("transition-transform duration-200", expanded && "rotate-180")}
            size={18}
          />
        </button>

        {/* Enable toggle */}
        <label className="relative inline-flex shrink-0 cursor-pointer items-center">
          <input
            checked={provider.enabled}
            className="peer sr-only"
            onChange={(e) => onUpdate({ enabled: e.target.checked })}
            type="checkbox"
          />
          <span className="h-6 w-10 rounded-full bg-white/10 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-text-secondary after:transition-all peer-checked:bg-accent peer-checked:after:translate-x-4 peer-checked:after:bg-white sm:h-7 sm:w-12 sm:after:left-1 sm:after:top-1 sm:peer-checked:after:translate-x-5" />
        </label>
      </div>

      {/* Collapsible body */}
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="space-y-4 border-t border-white/6 px-3 py-4 sm:px-4 md:px-5">
              {/* Editable fields */}
              <Field
                label="Label"
                onChange={(v) => onUpdate({ label: v })}
                value={provider.label}
              />
              <Field
                label="Base URL"
                onChange={(v) => onUpdate({ baseUrl: v })}
                placeholder="http://localhost:1234/v1"
                type="url"
                value={provider.baseUrl}
              />
              <div className="relative">
                <Field
                  label="API Key"
                  onChange={(v) => onUpdate({ apiKey: v })}
                  placeholder="sk-..."
                  type={showKey ? "text" : "password"}
                  value={provider.apiKey}
                />
                <button
                  aria-label={showKey ? "Hide API key" : "Show API key"}
                  className="absolute right-3 top-8 grid size-8 place-items-center rounded-lg text-text-quaternary transition-colors hover:text-text-secondary"
                  onClick={() => setShowKey((v) => !v)}
                  type="button"
                >
                  {showKey ? <RiEyeOffLine size={16} /> : <RiEyeLine size={16} />}
                </button>
              </div>

              <div className="space-y-1.5">
                <Field
                  label="Default model"
                  onChange={(v) => onUpdate({ model: v })}
                  placeholder="e.g. llama-3.2-3b-instruct"
                  value={provider.model}
                />
                <p className="text-xs leading-5 text-text-quaternary">
                  Used when no cached model is selected. Leave blank to pick from the dynamic list.
                </p>
              </div>

              {/* Delete provider (non-defaults only) */}
              {!isDefault ? (
                <button
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
                  onClick={onDelete}
                  type="button"
                >
                  <RiDeleteBinLine size={16} />
                  Remove provider
                </button>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
});
