"use client";

import { RiLoader4Line, RiSettings3Line } from "@remixicon/react";
import { AnimatePresence, motion } from "motion/react";

import { MessageComposer } from "@/features/conversation/components/message-composer";
import { MessageList } from "@/features/conversation/components/message-list";
import type { ConversationMessage } from "@/features/conversation/data/conversation";
import type { ProviderSettings } from "@/features/settings/data/providers";

type ConversationViewProps = {
  error: string | null;
  messages: ConversationMessage[];
  providers: ProviderSettings[];
  selectedProviderId: string;
  status: "idle" | "sending";
  onOpenSettings: () => void;
  onProviderChange: (providerId: string) => void;
  onSubmit: (content: string) => Promise<void>;
};

export function ConversationView({
  error,
  messages,
  providers,
  selectedProviderId,
  status,
  onOpenSettings,
  onProviderChange,
  onSubmit,
}: ConversationViewProps) {
  const hasMessages = messages.length > 0;

  return (
    <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_50%_42%,rgba(25,75,180,0.28),transparent_34rem),linear-gradient(180deg,rgba(12,15,21,0.98),#07090d_72%)]">
      <header className="flex h-16 shrink-0 items-center justify-between px-4 md:px-7">
        <div>
          <div className="text-sm font-semibold text-white/92">A4Chat</div>
          <div className="text-xs text-white/42">OpenAI-compatible local and online providers</div>
        </div>
        <div className="flex items-center gap-2">
          {status === "sending" ? (
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs text-white/70 sm:flex">
              <RiLoader4Line className="animate-spin text-accent-soft" size={16} />
              Waiting for provider
            </div>
          ) : null}
          <button
            aria-label="Open settings"
            className="grid size-10 place-items-center rounded-xl text-white/80 transition hover:bg-white/10 md:hidden"
            onClick={onOpenSettings}
            type="button"
          >
            <RiSettings3Line size={21} />
          </button>
        </div>
      </header>

      {hasMessages ? (
        <MessageList messages={messages} />
      ) : (
        <section className="flex flex-1 items-center justify-center px-4 pb-28">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl text-center"
            initial={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.28 }}
          >
            <h1 className="mb-10 text-3xl font-medium text-white/82 md:text-5xl">
              What can I help with?
            </h1>
            <MessageComposer
              disabled={status === "sending"}
              onProviderChange={onProviderChange}
              onSubmit={onSubmit}
              providers={providers}
              selectedProviderId={selectedProviderId}
            />
          </motion.div>
        </section>
      )}

      {hasMessages ? (
        <div className="shrink-0 px-3 pb-3 md:px-6 md:pb-5">
          <MessageComposer
            disabled={status === "sending"}
            onProviderChange={onProviderChange}
            onSubmit={onSubmit}
            providers={providers}
            selectedProviderId={selectedProviderId}
          />
        </div>
      ) : null}

      <AnimatePresence>
        {error ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-24 left-1/2 w-[min(92vw,720px)] -translate-x-1/2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
            exit={{ opacity: 0, y: 8 }}
            initial={{ opacity: 0, y: 8 }}
          >
            {error}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
