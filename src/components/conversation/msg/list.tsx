"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RiArrowDownLine } from "@remixicon/react";
import { AnimatePresence, motion } from "motion/react";

import { MessageRow } from "@/components/conversation/msg/row";
import type { ConversationMessage } from "@/components/conversation/utils/conversation";

type MessageListProps = {
  isStreaming: boolean;
  messages: ConversationMessage[];
  status: "idle" | "sending" | "streaming";
};

export function MessageList({ isStreaming, messages, status }: MessageListProps) {
  const scrollRef = useRef<HTMLElement>(null);
  const isNearBottomRef = useRef(true);
  const prevLengthRef = useRef(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  /* Track whether user is near bottom */
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distFromBottom < 120;
    setShowScrollBtn(distFromBottom > 300);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  /* Auto-scroll: on new message count OR during streaming if near bottom */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const isNewMessage = messages.length > prevLengthRef.current;
    prevLengthRef.current = messages.length;

    if (isNewMessage) {
      /* New message → always scroll to bottom smoothly */
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      });
      isNearBottomRef.current = true;
      setShowScrollBtn(false);
    }
  }, [messages.length]);

  /* During streaming: instant scroll if user is near bottom */
  const lastMsg = messages[messages.length - 1];
  const streamingContentLength = lastMsg?.content?.length ?? 0;

  useEffect(() => {
    if (!isStreaming || !isNearBottomRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [isStreaming, streamingContentLength]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    isNearBottomRef.current = true;
    setShowScrollBtn(false);
  }, []);

  return (
    <section
      ref={scrollRef}
      className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-2 md:px-8"
      style={{ contain: "content" }}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        {messages.map((message, index) => {
          const isLast = index === messages.length - 1;
          const isStreamingMsg = isLast && (isStreaming || status === "sending");
          return (
            <motion.div
              key={message.id}
              initial={index >= prevLengthRef.current - 1 ? { opacity: 0, y: 10 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <MessageRow
                isStreaming={isStreamingMsg}
                message={message}
                status={isStreamingMsg ? status : "idle"}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Scroll-to-bottom FAB */}
      <AnimatePresence>
        {showScrollBtn ? (
          <motion.button
            animate={{ opacity: 1, scale: 1 }}
            aria-label="Scroll to bottom"
            className="fixed bottom-28 right-6 z-30 grid size-10 place-items-center rounded-full border border-white/10 bg-surface-2 text-text-secondary shadow-lg shadow-black/30 transition-colors hover:bg-surface-3 hover:text-text-primary md:bottom-24 md:right-10"
            exit={{ opacity: 0, scale: 0.8 }}
            initial={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToBottom}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            type="button"
          >
            <RiArrowDownLine size={20} />
          </motion.button>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
