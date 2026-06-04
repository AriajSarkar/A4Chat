"use client";

import {
    RiArrowDownSLine,
    RiBrainLine,
    RiCheckLine,
    RiClipboardLine,
    RiCloseLine,
    RiDownloadLine,
    RiFileCopyLine,
    RiThumbDownLine,
    RiThumbUpLine,
} from "@remixicon/react";
import { AnimatePresence, motion } from "motion/react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import { ImageGenIndicator } from "@/components/Conversation/Message/Indicator/ImageGen";
import { PendingIndicator } from "@/components/Conversation/Message/Indicator/Pending";
import { cn } from "@/lib/cn";
import type { ConversationMessage } from "@/lib/Conversation";

type MessageRowProps = {
    isStreaming: boolean;
    message: ConversationMessage;
    status: "idle" | "sending" | "streaming";
};

export const MessageRow = memo(function MessageRow({
    isStreaming,
    message,
    status,
}: MessageRowProps) {
    const [reasoningOpen, setReasoningOpen] = useState(false);
    const reasoningScrollRef = useRef<HTMLDivElement>(null);
    const wasReasoningStreamingRef = useRef(false);
    const isUser = message.role === "user";
    const isSending = isStreaming && status === "sending" && !message.content && !message.reasoning;
    const hasReasoning = Boolean(message.reasoning);
    const isReasoningStreaming = isStreaming && !message.content && hasReasoning;

    // Extract base64 images before passing to ReactMarkdown.
    // This is a massive performance optimization to prevent the O(N^2) markdown
    // parser from choking on 10-50MB base64 strings and freezing the UI!
    const { textContent, embeddedImages } = useMemo(() => {
        if (!message.content) return { textContent: "", embeddedImages: [] };

        const images: { alt: string; src: string; key: string }[] = [];
        const dataUriRegex = /!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/g;

        // Fast O(N) regex replace natively in V8 engine
        const textContent = message.content.replace(dataUriRegex, (match, alt, src) => {
            images.push({ alt, src, key: src.substring(0, 100) });
            return ""; // Erase the image markdown so ReactMarkdown doesn't have to parse it
        });

        return { textContent, embeddedImages: images };
    }, [message.content]);

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
                    <div className="flex flex-col gap-2">
                        {message.images && message.images.length > 0 && (
                            <div className="flex flex-wrap justify-end gap-2">
                                {message.images.map((img, idx) => (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        key={idx}
                                        src={img}
                                        alt="attachment"
                                        className="max-h-60 max-w-60 rounded-2xl border border-white/10 object-cover shadow-md shadow-black/20"
                                    />
                                ))}
                            </div>
                        )}
                        {message.content && (
                            <div className="bg-accent/12 text-text-primary self-end rounded-2xl rounded-br-md px-4 py-3 text-right text-[15px] leading-7 whitespace-pre-wrap">
                                {message.content}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-text-secondary space-y-2.5 text-[15px] leading-7">
                        {/* Model badge */}
                        {message.model || message.providerLabel || message.providerId ? (
                            <div className="bg-accent/10 text-accent-soft inline-block rounded-full px-2.5 py-0.5 font-mono text-xs">
                                {message.model || message.providerLabel || message.providerId}
                            </div>
                        ) : null}

                        {/* Inline indicator — type-aware based on API response */}
                        {isSending ? (
                            message.responseType === "image" ? (
                                <ImageGenIndicator />
                            ) : (
                                <PendingIndicator />
                            )
                        ) : null}

                        {/* Reasoning — compact, scrollable, latest content visible */}
                        {hasReasoning ? (
                            <div className="rounded-xl border border-white/6 bg-white/2">
                                <button
                                    className="text-text-tertiary hover:text-text-secondary flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors"
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
                                    <RiBrainLine className="text-accent-soft shrink-0" size={18} />
                                    <span>Thought</span>
                                    {isReasoningStreaming ? (
                                        <span className="streaming-cursor ml-1" />
                                    ) : null}
                                </button>
                                <AnimatePresence initial={false}>
                                    {reasoningOpen ? (
                                        <motion.div
                                            animate={{ height: "auto", opacity: 1 }}
                                            className="overflow-hidden"
                                            exit={{ height: 0, opacity: 0 }}
                                            initial={{ height: 0, opacity: 0 }}
                                            transition={{
                                                type: "spring",
                                                damping: 25,
                                                stiffness: 300,
                                            }}
                                        >
                                            <div
                                                ref={reasoningScrollRef}
                                                className="border-accent/20 ml-4 max-h-40 overflow-y-auto scroll-smooth border-l-2"
                                            >
                                                <p className="text-text-quaternary px-4 pb-3 text-sm leading-6 whitespace-pre-wrap">
                                                    {message.reasoning}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ) : null}
                                </AnimatePresence>
                            </div>
                        ) : null}

                        {/* Message content — real-time markdown rendering */}
                        {textContent ? (
                            <div className={cn("prose-chat", isStreaming && "streaming")}>
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={isStreaming ? undefined : [rehypeHighlight]}
                                    components={{ pre: CodeBlock, img: ImageBlock }}
                                    urlTransform={(url) => {
                                        if (url.startsWith("data:image/")) return url;
                                        return defaultUrlTransform(url);
                                    }}
                                >
                                    {textContent}
                                </ReactMarkdown>
                            </div>
                        ) : null}

                        {/* Extracted Images */}
                        {embeddedImages.length > 0 ? (
                            <div className="mt-4 flex flex-wrap gap-4">
                                {embeddedImages.map((img, i) => (
                                    <ImageBlock key={img.key + i} src={img.src} alt={img.alt} />
                                ))}
                            </div>
                        ) : null}

                        {/* Footer (hidden during streaming) */}
                        {!isStreaming && message.content ? (
                            <div className="flex items-center gap-3">
                                {typeof message.outputTokens === "number" ? (
                                    <span className="text-text-quaternary rounded-md bg-white/4 px-2 py-0.5 text-xs">
                                        {message.outputTokens.toLocaleString()} tokens
                                    </span>
                                ) : null}
                                <div className="flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover/msg:opacity-100">
                                    <CopyButton text={textContent} />
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
                className="text-text-tertiary hover:text-text-primary absolute top-2 right-2 flex items-center gap-1 rounded-lg bg-white/8 px-2 py-1 text-xs opacity-0 backdrop-blur-sm transition-all group-hover/code:opacity-100 hover:bg-white/[0.14]"
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
            className="text-text-quaternary hover:text-text-secondary grid size-7 place-items-center rounded-lg transition-colors hover:bg-white/8"
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
            className="text-text-quaternary hover:text-text-secondary grid size-7 place-items-center rounded-lg transition-colors hover:bg-white/8"
            type="button"
        >
            <Icon size={15} />
        </button>
    );
}

/* ── Custom Image Block (Thumbnail + Lightbox) ───────── */

function ImageBlock({ src, alt, ...props }: React.ComponentPropsWithoutRef<"img">) {
    const [open, setOpen] = useState(false);
    const [downloadStatus, setDownloadStatus] = useState<
        "idle" | "downloading" | "success" | "error"
    >("idle");

    const downloadName = alt && alt.trim().length > 0 ? alt : "generated_image.png";

    const handleDownload = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (downloadStatus !== "idle") return;

        setDownloadStatus("downloading");

        try {
            const dataStr = src as string;
            const b64Data = dataStr.includes(",") ? dataStr.split(",")[1] : dataStr;
            const raw = window.atob(b64Data);
            const bytes = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) {
                bytes[i] = raw.charCodeAt(i);
            }

            // Check if user has an auto-save location configured in Settings
            const autoSaveLoc = localStorage.getItem("a4chat_save_location");

            if (autoSaveLoc) {
                // Native silent auto-save to the configured directory!
                const sep = autoSaveLoc.includes("\\") ? "\\" : "/";
                const cleanLoc = autoSaveLoc.endsWith(sep) ? autoSaveLoc.slice(0, -1) : autoSaveLoc;
                const fullPath = `${cleanLoc}${sep}${downloadName}`;

                try {
                    const { writeFile, mkdir } = await import("@tauri-apps/plugin-fs");

                    // Ensure directory exists first (recursive)
                    await mkdir(cleanLoc, { recursive: true }).catch(() => {});

                    // Write the file - this automatically triggers Android permission dialog if needed!
                    await writeFile(fullPath, bytes);
                } catch (fsError) {
                    console.error("Native FS error, falling back:", fsError);
                    // If plugin-fs fails, try the rust command as a fallback
                    const { invoke } = await import("@tauri-apps/api/core");
                    await invoke("save_file_to_disk", { path: fullPath, bytes: Array.from(bytes) });
                }
            } else if ("showSaveFilePicker" in window) {
                // 1. Show native save dialog so user knows EXACTLY where it saves
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: downloadName,
                    types: [
                        {
                            description: "Images",
                            accept: { "image/png": [".png"], "image/jpeg": [".jpeg", ".jpg"] },
                        },
                    ],
                });

                // 2. Write directly to disk
                const writable = await handle.createWritable();
                await writable.write(bytes);
                await writable.close();
            } else {
                // Fallback for non-Chromium webviews
                const a = document.createElement("a");
                a.href = src as string;
                a.download = downloadName;
                document.body.appendChild(a);
                a.click();
                a.remove();
            }

            setDownloadStatus("success");
            setTimeout(() => setDownloadStatus("idle"), 2500);
        } catch (error: any) {
            // If user just cancelled the picker, return to idle without error
            if (error.name === "AbortError") {
                setDownloadStatus("idle");
                return;
            }
            console.error("Failed to download image:", error);
            setDownloadStatus("error");
            setTimeout(() => setDownloadStatus("idle"), 2500);
        }
    };

    return (
        <div style={{ perspective: "1000px" }} className="inline-block">
            <motion.span
                initial={{ opacity: 0, scale: 0.8, rotateY: -15, rotateX: 10, y: 20 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0, rotateX: 0, y: 0 }}
                transition={{ type: "spring", stiffness: 180, damping: 15 }}
                className="my-5 inline-block cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-black/20 shadow-xl shadow-black/20 transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => setOpen(true)}
            >
                <img
                    src={src}
                    alt={alt}
                    className="max-h-80 w-auto max-w-full object-contain"
                    {...props}
                />
            </motion.span>

            {typeof document !== "undefined" && open
                ? createPortal(
                      <AnimatePresence>
                          <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-md"
                              onClick={() => setOpen(false)}
                          >
                              <button
                                  className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                                  onClick={() => setOpen(false)}
                              >
                                  <RiCloseLine size={24} />
                              </button>

                              <img
                                  src={src}
                                  alt={alt}
                                  className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
                                  onClick={(e) => e.stopPropagation()}
                              />

                              <div className="mt-6 flex gap-4" onClick={(e) => e.stopPropagation()}>
                                  <button
                                      onClick={handleDownload}
                                      disabled={downloadStatus === "downloading"}
                                      className={cn(
                                          "flex min-w-40 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform",
                                          downloadStatus === "success" &&
                                              "bg-green-600 hover:scale-105 active:scale-95",
                                          downloadStatus === "error" &&
                                              "bg-red-600 hover:scale-105 active:scale-95",
                                          downloadStatus === "idle" &&
                                              "bg-accent hover:scale-105 active:scale-95",
                                          downloadStatus === "downloading" &&
                                              "bg-accent/70 cursor-not-allowed opacity-80",
                                      )}
                                  >
                                      {downloadStatus === "success" ? (
                                          <>
                                              <RiCheckLine size={18} />
                                              Saved!
                                          </>
                                      ) : downloadStatus === "error" ? (
                                          <>
                                              <RiCloseLine size={18} />
                                              Failed
                                          </>
                                      ) : downloadStatus === "downloading" ? (
                                          <>Saving...</>
                                      ) : (
                                          <>
                                              <RiDownloadLine size={18} />
                                              Download Image
                                          </>
                                      )}
                                  </button>
                              </div>
                          </motion.div>
                      </AnimatePresence>,
                      document.body,
                  )
                : null}
        </div>
    );
}
