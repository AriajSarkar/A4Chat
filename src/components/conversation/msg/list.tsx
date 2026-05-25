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
    <div className="relative flex min-h-0 flex-1 flex-col">
      <section
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-2 md:px-8"
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
      </section>

      {/* Scroll-to-bottom FAB */}
      <AnimatePresence>
        {showScrollBtn ? (
          <motion.button
            animate={{ opacity: 1, y: 0 }}
            aria-label="Scroll to bottom"
            className="absolute bottom-2 left-1/2 z-30 flex h-9 -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/10 bg-surface-2 px-2.5 text-[13px] font-medium text-text-secondary shadow-lg shadow-black/40 backdrop-blur-md transition-all hover:bg-surface-3 hover:text-text-primary active:scale-95"
            exit={{ opacity: 0, y: 10 }}
            initial={{ opacity: 0, y: 10 }}
            onClick={scrollToBottom}
            transition={{ type: "spring", damping: 25, stiffness: 400 }}
            type="button"
          >
            <RiArrowDownLine size={16} />
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
