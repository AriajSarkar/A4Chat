"use client";

import { useState } from "react";
import { RiArrowDownSLine, RiBrainLine } from "@remixicon/react";
import { AnimatePresence, motion } from "motion/react";

import type { ConversationMessage } from "@/features/conversation/data/conversation";
import { cn } from "@/lib/cn";

type MessageRowProps = {
  message: ConversationMessage;
};

export function MessageRow({ message }: MessageRowProps) {
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const isUser = message.role === "user";

  return (
    <article className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[min(100%,760px)]", isUser ? "w-fit" : "w-full")}>
        {isUser ? (
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-[15px] leading-7 text-white/92">
            {message.content}
          </div>
        ) : (
          <div className="space-y-3 text-[15px] leading-7 text-white/88">
            <div className="font-mono text-xs text-accent-soft">
              {message.model ?? message.providerLabel}
            </div>
            {message.reasoning ? (
              <div className="rounded-xl border border-white/10 bg-white/6">
                <button
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-white/76"
                  onClick={() => setReasoningOpen((value) => !value)}
                  type="button"
                >
                  <RiArrowDownSLine
                    className={cn("transition", !reasoningOpen && "-rotate-90")}
                    size={18}
                  />
                  <RiBrainLine className="text-accent-soft" size={18} />
                  Thought
                </button>
                <AnimatePresence initial={false}>
                  {reasoningOpen ? (
                    <motion.div
                      animate={{ height: "auto", opacity: 1 }}
                      className="overflow-hidden"
                      exit={{ height: 0, opacity: 0 }}
                      initial={{ height: 0, opacity: 0 }}
                    >
                      <p className="px-4 pb-4 text-sm leading-7 text-white/68">
                        {message.reasoning}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : null}
            <div className="whitespace-pre-wrap">{message.content}</div>
            {typeof message.outputTokens === "number" ? (
              <div className="text-xs text-white/38">
                {message.outputTokens.toLocaleString()} output tokens
              </div>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}
