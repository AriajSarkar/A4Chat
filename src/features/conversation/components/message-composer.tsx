"use client";

import { FormEvent, useLayoutEffect, useRef, useState } from "react";
import { RiAddLine, RiArrowDownSLine, RiMicLine, RiSendPlane2Fill } from "@remixicon/react";
import { motion } from "motion/react";

import type { ProviderSettings } from "@/features/settings/data/providers";

type MessageComposerProps = {
  disabled: boolean;
  providers: ProviderSettings[];
  selectedProviderId: string;
  onProviderChange: (providerId: string) => void;
  onSubmit: (content: string) => Promise<void>;
};

export function MessageComposer({
  disabled,
  providers,
  selectedProviderId,
  onProviderChange,
  onSubmit,
}: MessageComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSubmit = value.trim().length > 0 && !disabled;

  useLayoutEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [value]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    const nextValue = value.trim();
    setValue("");
    await onSubmit(nextValue);
  }

  return (
    <motion.form
      className="mx-auto flex w-full max-w-4xl items-end gap-2 rounded-[1.75rem] border border-white/8 bg-[#1b1d20] p-2 text-left shadow-2xl shadow-blue-950/20 transition focus-within:border-accent/60 md:gap-3 md:p-3"
      layout
      onSubmit={handleSubmit}
    >
      <button
        aria-label="Add attachment"
        className="grid size-10 shrink-0 place-items-center rounded-full text-white/82 transition hover:bg-white/10"
        type="button"
      >
        <RiAddLine size={24} />
      </button>
      <textarea
        className="max-h-44 min-h-10 flex-1 resize-none bg-transparent py-2 text-[16px] leading-6 text-white/92 outline-none placeholder:text-white/42"
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder="Ask any configured model"
        ref={textareaRef}
        rows={1}
        value={value}
      />
      <label className="flex max-w-32 items-center gap-2 rounded-full px-2 py-2 text-sm text-white/76 md:max-w-44 md:px-3">
        <span className="size-2 rounded-full bg-accent" />
        <select
          aria-label="Provider"
          className="max-w-40 appearance-none bg-transparent pr-5 outline-none"
          onChange={(event) => onProviderChange(event.target.value)}
          value={selectedProviderId}
        >
          {providers
            .filter((provider) => provider.enabled)
            .map((provider) => (
              <option className="bg-[#111419]" key={provider.id} value={provider.id}>
                {provider.label}
              </option>
            ))}
        </select>
        <RiArrowDownSLine className="-ml-5 pointer-events-none" size={18} />
      </label>
      <button
        aria-label="Voice input"
        className="hidden size-10 shrink-0 place-items-center rounded-full text-white/74 transition hover:bg-white/10 md:grid"
        type="button"
      >
        <RiMicLine size={21} />
      </button>
      <button
        aria-label="Send message"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-black transition disabled:bg-white/10 disabled:text-white/30"
        disabled={!canSubmit}
        type="submit"
      >
        <RiSendPlane2Fill size={19} />
      </button>
    </motion.form>
  );
}
