"use client";

import { memo, useEffect, useRef, useState } from "react";
import {
  RiArrowDownSLine,
  RiBrainLine,
  RiCheckLine,
  RiClipboardLine,
  RiFileCopyLine,
  RiThumbDownLine,
  RiThumbUpLine,
} from "@remixicon/react";
import { AnimatePresence, motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

import type { ConversationMessage } from "@/components/conversation/utils/conversation";
import { cn } from "@/lib/cn";

type MessageRowProps = {
  isStreaming: boolean;
  message: ConversationMessage;
  status: "idle" | "sending" | "streaming";
};

export const MessageRow = memo(function MessageRow({ isStreaming, message, status }: MessageRowProps) {
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const reasoningScrollRef = useRef<HTMLDivElement>(null);
  const wasReasoningStreamingRef = useRef(false);
  const isUser = message.role === "user";
  const isSending = isStreaming && status === "sending" && !message.content && !message.reasoning;
  const hasReasoning = Boolean(message.reasoning);
  const isReasoningStreaming = isStreaming && !message.content && hasReasoning;

  /* Auto-open reasoning during streaming */
  useEffect(() => {
    if (isReasoningStreaming) {
      setReasoningOpen(true);
      wasReasoningStreamingRef.current = true;
    }
  }, [isReasoningStreaming]);

  /* Auto-close reasoning when content starts OR when streaming finishes */
  useEffect(() => {
    if (!wasReasoningStreamingRef.current) return;
    // Close when content starts streaming
    if (message.content && isStreaming) {
      setReasoningOpen(false);
      wasReasoningStreamingRef.current = false;
    }
    // Close when streaming finishes entirely
    if (!isStreaming && hasReasoning) {
      setReasoningOpen(false);
      wasReasoningStreamingRef.current = false;
    }
  }, [message.content, isStreaming, hasReasoning]);

  /* Auto-scroll reasoning to bottom while streaming */
  useEffect(() => {
    if (!isReasoningStreaming || !reasoningScrollRef.current) return;
    const el = reasoningScrollRef.current;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  });

  return (
    <article className={cn("group/msg flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[min(100%,760px)]", isUser ? "w-fit max-w-[85%]" : "w-full")}>
        {isUser ? (
          <div className="rounded-2xl rounded-br-md bg-accent/[0.12] px-4 py-3 text-[15px] leading-7 text-text-primary">
            {message.content}
          </div>
        ) : (
          <div className="space-y-2.5 text-[15px] leading-7 text-text-secondary">
            {/* Model badge */}
            {message.model || message.providerLabel || message.providerId ? (
              <div className="inline-block rounded-full bg-accent/10 px-2.5 py-0.5 font-mono text-xs text-accent-soft">
                {message.model || message.providerLabel || message.providerId}
              </div>
            ) : null}

            {/* Inline thinking indicator — waiting for first token */}
            {isSending ? (
              <div className="flex items-center gap-3 py-4">
                <div className="flex items-center gap-1.5">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
                <span className="text-sm text-text-quaternary">Thinking…</span>
              </div>
            ) : null}

            {/* Reasoning — compact, scrollable, latest content visible */}
            {hasReasoning ? (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <button
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-text-tertiary transition-colors hover:text-text-secondary"
                  onClick={() => setReasoningOpen((v) => !v)}
                  type="button"
                >
                  <RiArrowDownSLine
                    className={cn(
                      "shrink-0 transition-transform duration-200",
                      !reasoningOpen && "-rotate-90",
                    )}
                    size={18}
                  />
                  <RiBrainLine className="shrink-0 text-accent-soft" size={18} />
                  <span>Thought</span>
                  {isReasoningStreaming ? <span className="streaming-cursor ml-1" /> : null}
                </button>
                <AnimatePresence initial={false}>
                  {reasoningOpen ? (
                    <motion.div
                      animate={{ height: "auto", opacity: 1 }}
                      className="overflow-hidden"
                      exit={{ height: 0, opacity: 0 }}
                      initial={{ height: 0, opacity: 0 }}
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                      <div
                        ref={reasoningScrollRef}
                        className="ml-4 max-h-40 scroll-smooth overflow-y-auto border-l-2 border-accent/20"
                      >
                        <p className="whitespace-pre-wrap px-4 pb-3 text-sm leading-6 text-text-quaternary">
                          {message.reasoning}
                        </p>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : null}

            {/* Message content — real-time markdown rendering */}
            {message.content ? (
              <div className={cn("prose-chat", isStreaming && "streaming")}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={isStreaming ? undefined : [rehypeHighlight]}
                  components={{ pre: CodeBlock }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : null}

            {/* Footer (hidden during streaming) */}
            {!isStreaming && message.content ? (
              <div className="flex items-center gap-3">
                {typeof message.outputTokens === "number" ? (
                  <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-xs text-text-quaternary">
                    {message.outputTokens.toLocaleString()} tokens
                  </span>
                ) : null}
                <div className="flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover/msg:opacity-100">
                  <CopyButton text={message.content} />
                  <ActionButton icon={RiThumbUpLine} label="Like" />
                  <ActionButton icon={RiThumbDownLine} label="Dislike" />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
});

/* ── Code block with copy button ─────────────────────── */

function CodeBlock({ children, ...props }: React.ComponentPropsWithoutRef<"pre">) {
  const [copied, setCopied] = useState(false);

  function extractText(node: React.ReactNode): string {
    if (typeof node === "string") return node;
    if (Array.isArray(node)) return node.map(extractText).join("");
    if (node && typeof node === "object" && "props" in node) {
      const el = node as { props: { children?: React.ReactNode } };
      return extractText(el.props.children);
    }
    return "";
  }

  const code = extractText(children);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="group/code relative">
      <button
        aria-label="Copy code"
        className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-white/[0.08] px-2 py-1 text-xs text-text-tertiary opacity-0 backdrop-blur-sm transition-all hover:bg-white/[0.14] hover:text-text-primary group-hover/code:opacity-100"
        onClick={handleCopy}
        type="button"
      >
        {copied ? (
          <>
            <RiCheckLine size={14} /> Copied
          </>
        ) : (
          <>
            <RiClipboardLine size={14} /> Copy
          </>
        )}
      </button>
      <pre {...props}>{children}</pre>
    </div>
  );
}

/* ── Small action buttons ────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      aria-label="Copy message"
      className="grid size-7 place-items-center rounded-lg text-text-quaternary transition-colors hover:bg-white/[0.08] hover:text-text-secondary"
      onClick={handleCopy}
      type="button"
    >
      {copied ? <RiCheckLine size={15} /> : <RiFileCopyLine size={15} />}
    </button>
  );
}

function ActionButton({ icon: Icon, label }: { icon: typeof RiThumbUpLine; label: string }) {
  return (
    <button
      aria-label={label}
      className="grid size-7 place-items-center rounded-lg text-text-quaternary transition-colors hover:bg-white/[0.08] hover:text-text-secondary"
      type="button"
    >
      <Icon size={15} />
    </button>
  );
}
