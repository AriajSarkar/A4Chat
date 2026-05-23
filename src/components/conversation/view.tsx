"use client";

import { useCallback, useEffect, useRef } from "react";
import { RiMenuLine } from "@remixicon/react";
import { AnimatePresence, motion } from "motion/react";

import { MessageComposer } from "./msg/composer";
import { MessageList } from "@/components/conversation/msg/list";
import type { ConversationMessage } from "@/components/conversation/utils/conversation";
import type { ProviderSettings } from "@/components/settings/utils/providers";

type ConversationViewProps = {
  error: string | null;
  isStreaming: boolean;
  messages: ConversationMessage[];
  providers: ProviderSettings[];
  selectedProviderId: string;
  status: "idle" | "sending" | "streaming";
  onProviderChange: (providerId: string) => void;
  onStopStreaming: () => void;
  onSubmit: (content: string) => Promise<void>;
  onToggleSidebar: () => void;
};

/** Swipe-from-left-edge to open sidebar (Android/iOS) */
function useSwipeToOpenSidebar(onOpen: () => void) {
  const startX = useRef(0);
  const startY = useRef(0);

  useEffect(() => {
    const isTouchDevice = () =>
      "ontouchstart" in window || navigator.maxTouchPoints > 0;

    if (!isTouchDevice()) return;

    const handleTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      startX.current = t.clientX;
      startY.current = t.clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;
      // Swipe right from left edge (within 30px), at least 50px horizontal, mostly horizontal
      if (startX.current < 30 && dx > 50 && Math.abs(dx) > Math.abs(dy)) {
        onOpen();
      }
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onOpen]);
}

export function ConversationView({
  error,
  isStreaming,
  messages,
  providers,
  selectedProviderId,
  status,
  onProviderChange,
  onStopStreaming,
  onSubmit,
  onToggleSidebar,
}: ConversationViewProps) {
  const hasMessages = messages.length > 0;

  // Swipe from left edge to open sidebar on touch devices
  const stableToggle = useCallback(onToggleSidebar, [onToggleSidebar]);
  useSwipeToOpenSidebar(stableToggle);

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="flex h-12 shrink-0 items-center px-3 md:h-14 md:px-6">
        <button
          aria-label="Open sidebar"
          className="grid size-10 cursor-pointer place-items-center rounded-xl text-text-secondary active:bg-white/10 md:hidden"
          onClick={onToggleSidebar}
          style={{ touchAction: "manipulation" }}
          type="button"
        >
          <RiMenuLine size={22} />
        </button>
      </header>

      {hasMessages ? (
        <MessageList isStreaming={isStreaming} messages={messages} status={status} />
      ) : (
        <section className="flex flex-1 items-center justify-center px-4 pb-28">
          <div className="w-full max-w-3xl text-center">
            <h1 className="mb-10 bg-gradient-to-b from-text-primary to-text-tertiary bg-clip-text text-3xl font-light tracking-wide text-transparent md:text-5xl">
              What can I help with?
            </h1>
            <MessageComposer
              disabled={status !== "idle"}
              onProviderChange={onProviderChange}
              onStopStreaming={onStopStreaming}
              onSubmit={onSubmit}
              providers={providers}
              selectedProviderId={selectedProviderId}
              status={status}
            />
          </div>
        </section>
      )}

      {/* Bottom composer — smooth entrance animation */}
      <AnimatePresence>
        {hasMessages ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="safe-bottom shrink-0 px-3 pb-3 md:px-6 md:pb-5"
            exit={{ opacity: 0, y: 24 }}
            initial={{ opacity: 0, y: 24 }}
            key="bottom-composer"
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
          >
            <MessageComposer
              disabled={status === "sending"}
              onProviderChange={onProviderChange}
              onStopStreaming={onStopStreaming}
              onSubmit={onSubmit}
              providers={providers}
              selectedProviderId={selectedProviderId}
              status={status}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {error ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-x-3 bottom-24 z-20 mx-auto max-w-[720px] rounded-xl border border-danger/20 bg-danger/[0.08] px-4 py-3 text-sm text-red-200 backdrop-blur-sm md:inset-x-6"
            exit={{ opacity: 0, y: 8 }}
            initial={{ opacity: 0, y: 8 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            {error}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
