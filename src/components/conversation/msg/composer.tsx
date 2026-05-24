"use client";

import { FormEvent, memo, useEffect, useRef, useState } from "react";
import { RiAddLine, RiSendPlane2Fill, RiStopCircleFill } from "@remixicon/react";

import { ModelSelector } from "@/components/conversation/msg/model-selector";
import type { ProviderModel, ProviderSettings } from "@/components/settings/utils/providers";
import { cn } from "@/lib/cn";

type MessageComposerProps = {
  disabled: boolean;
  providers: ProviderSettings[];
  providerModels: Map<string, ProviderModel[]>;
  selectedProviderCacheAt: number;
  selectedProviderId: string;
  selectedModelId: string;
  status: "idle" | "sending" | "streaming";
  onModelChange: (providerId: string, modelId: string) => void;
  onRefreshProviderModels: (
    provider: ProviderSettings,
    options?: { force?: boolean; silent?: boolean },
  ) => Promise<boolean>;
  onToggleFavorite: (providerId: string, modelId: string) => void;
  onStopStreaming: () => void;
  onSubmit: (content: string) => Promise<void>;
  refreshingProviderId: string | null;
};

export const MessageComposer = memo(function MessageComposer({
  disabled,
  providers,
  providerModels,
  selectedProviderCacheAt,
  selectedProviderId,
  selectedModelId,
  status,
  onModelChange,
  onRefreshProviderModels,
  onToggleFavorite,
  onStopStreaming,
  onSubmit,
  refreshingProviderId,
}: MessageComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSubmit = value.trim().length > 0 && !disabled;
  const isActive = status === "sending" || status === "streaming";

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [value]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    const nextValue = value.trim();
    setValue("");
    await onSubmit(nextValue);
  }

  return (
    <form
      className="relative mx-auto flex w-full max-w-4xl flex-col rounded-2xl border border-white/8 bg-white/3 shadow-lg shadow-black/20 backdrop-blur-xl transition-colors duration-200 focus-within:border-accent/40 md:rounded-3xl"
      onSubmit={handleSubmit}
    >
      {/* Textarea row */}
      <div className="flex items-end gap-1 px-2 pt-2 md:gap-2 md:px-3 md:pt-3">
        <textarea
          autoComplete="off"
          className="max-h-44 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-[15px] leading-6 text-text-primary outline-none placeholder:text-text-quaternary"
          disabled={disabled}
          enterKeyHint="send"
          inputMode="text"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Message"
          ref={textareaRef}
          rows={1}
          value={value}
        />
      </div>

      {/* Action bar: attach + model selector + send */}
      <div className="flex items-center gap-1 px-1.5 pb-1.5 md:gap-2 md:px-2 md:pb-2">
        <button
          aria-label="Add attachment"
          className="grid size-9 shrink-0 place-items-center rounded-xl text-text-tertiary transition-colors hover:bg-white/6 md:size-10"
          type="button"
        >
          <RiAddLine size={20} />
        </button>

        {/* Model selector (replaces old provider dropdown) */}
        <ModelSelector
          isActive={isActive}
          onSelect={onModelChange}
          onRefreshProviderModels={onRefreshProviderModels}
          onToggleFavorite={onToggleFavorite}
          providerModels={providerModels}
          providers={providers}
          selectedProviderCacheAt={selectedProviderCacheAt}
          refreshingProviderId={refreshingProviderId}
          selectedModelId={selectedModelId}
          selectedProviderId={selectedProviderId}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Send / Stop */}
        {isActive ? (
          <button
            aria-label="Stop generating"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-text-primary transition-all duration-200 hover:bg-white/16 hover:scale-105 md:size-10"
            onClick={onStopStreaming}
            type="button"
          >
            <RiStopCircleFill size={18} />
          </button>
        ) : (
          <button
            aria-label="Send message"
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full transition-all duration-200 md:size-10",
              canSubmit
                ? "bg-accent text-white shadow-[0_0_20px_rgba(61,139,255,0.3)] hover:scale-105"
                : "bg-white/6 text-text-quaternary",
            )}
            disabled={!canSubmit}
            type="submit"
          >
            <RiSendPlane2Fill size={16} />
          </button>
        )}
      </div>
    </form>
  );
});
