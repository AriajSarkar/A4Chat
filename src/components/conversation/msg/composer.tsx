"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  RiAddLine,
  RiArrowDownSLine,
  RiCheckLine,
  RiSendPlane2Fill,
  RiStopCircleFill,
} from "@remixicon/react";

import type { ProviderSettings } from "@/components/settings/utils/providers";
import { cn } from "@/lib/cn";

type MessageComposerProps = {
  disabled: boolean;
  providers: ProviderSettings[];
  selectedProviderId: string;
  status: "idle" | "sending" | "streaming";
  onProviderChange: (providerId: string) => void;
  onStopStreaming: () => void;
  onSubmit: (content: string) => Promise<void>;
};

export function MessageComposer({
  disabled,
  providers,
  selectedProviderId,
  status,
  onProviderChange,
  onStopStreaming,
  onSubmit,
}: MessageComposerProps) {
  const [value, setValue] = useState("");
  const [providerOpen, setProviderOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const canSubmit = value.trim().length > 0 && !disabled;
  const isActive = status === "sending" || status === "streaming";

  const enabledProviders = providers.filter((p) => p.enabled);
  const selectedLabel = enabledProviders.find((p) => p.id === selectedProviderId)?.label ?? "Provider";

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [value]);

  /* Close dropdown on outside click/touch */
  useEffect(() => {
    if (!providerOpen) return;
    function handleClick(e: PointerEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProviderOpen(false);
      }
    }
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, [providerOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    const nextValue = value.trim();
    setValue("");
    await onSubmit(nextValue);
  }

  return (
    <form
      className="composer-glow relative mx-auto flex w-full max-w-4xl flex-col rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-lg shadow-black/20 backdrop-blur-xl transition-colors duration-200 focus-within:border-accent/40 md:rounded-[1.5rem]"
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

      {/* Action bar: attach + provider + send */}
      <div className="flex items-center gap-1 px-1.5 pb-1.5 md:gap-2 md:px-2 md:pb-2">
        <button
          aria-label="Add attachment"
          className="grid size-9 shrink-0 place-items-center rounded-xl text-text-tertiary transition-colors hover:bg-white/[0.06] md:size-10"
          type="button"
        >
          <RiAddLine size={20} />
        </button>

        {/* Provider selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            className="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-xs text-text-tertiary transition-colors hover:bg-white/[0.06] md:gap-2 md:px-3 md:py-2 md:text-sm"
            onClick={() => setProviderOpen((v) => !v)}
            type="button"
          >
            <span
              className={cn(
                "size-1.5 rounded-full bg-accent transition-shadow md:size-2",
                isActive && "animate-pulse shadow-[0_0_8px_rgba(61,139,255,0.5)]",
              )}
            />
            <span className="max-w-24 truncate md:max-w-36">{selectedLabel}</span>
            <RiArrowDownSLine
              className={cn("transition-transform duration-150", providerOpen && "rotate-180")}
              size={14}
            />
          </button>

          {providerOpen ? (
            <div className="absolute bottom-full right-0 z-50 mb-2 min-w-[180px] overflow-hidden rounded-xl border border-white/[0.08] bg-surface-2 py-1 shadow-xl shadow-black/40 backdrop-blur-xl">
              {enabledProviders.map((p) => (
                <button
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors",
                    p.id === selectedProviderId
                      ? "bg-accent/10 text-accent-soft"
                      : "text-text-secondary hover:bg-white/[0.06] hover:text-text-primary",
                  )}
                  key={p.id}
                  onClick={() => {
                    onProviderChange(p.id);
                    setProviderOpen(false);
                  }}
                  type="button"
                >
                  {p.id === selectedProviderId ? <RiCheckLine size={16} /> : <span className="w-4" />}
                  {p.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Send / Stop */}
        {isActive ? (
          <button
            aria-label="Stop generating"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.1] text-text-primary transition-all duration-200 hover:bg-white/[0.16] hover:scale-105 md:size-10"
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
                : "bg-white/[0.06] text-text-quaternary",
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
}
