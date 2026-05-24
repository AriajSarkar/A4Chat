"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RiChat3Line,
  RiCloseLine,
  RiDeleteBinLine,
  RiSearchLine,
  RiTimeLine,
} from "@remixicon/react";
import { AnimatePresence, motion } from "motion/react";

import { deleteConversation, type SavedConversation } from "@/lib/native";
import { cn } from "@/lib/cn";

type SearchDialogProps = {
  conversations: SavedConversation[];
  open: boolean;
  onClose: () => void;
  onLoadConversation: (id: string) => void;
  onRefresh: () => void;
};

export function SearchDialog({
  conversations,
  open,
  onClose,
  onLoadConversation,
  onRefresh,
}: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    const lower = query.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(lower));
  }, [query, conversations]);

  /* Reset on open */
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  /* Keep selected index in bounds */
  useEffect(() => {
    if (selectedIndex >= filtered.length) setSelectedIndex(Math.max(0, filtered.length - 1));
  }, [filtered.length, selectedIndex]);

  /* Scroll selected item into view */
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        onLoadConversation(filtered[selectedIndex].id);
        onClose();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [filtered, selectedIndex, onLoadConversation, onClose],
  );

  const handleDelete = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      await deleteConversation(id);
      onRefresh();
    },
    [onRefresh],
  );

  function formatRelativeTime(timestamp: number) {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open ? (
        <>
          {/* Backdrop */}
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="fixed inset-x-4 top-[15%] z-[61] mx-auto max-w-xl overflow-hidden rounded-2xl border border-white/[0.08] bg-surface-1 shadow-2xl shadow-black/40 backdrop-blur-xl md:inset-x-auto md:w-full"
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            onKeyDown={handleKeyDown}
            transition={{ type: "spring", damping: 28, stiffness: 380 }}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
              <RiSearchLine className="shrink-0 text-text-tertiary" size={20} />
              <input
                className="min-w-0 flex-1 bg-transparent text-[15px] text-text-primary outline-none placeholder:text-text-quaternary"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Search conversations..."
                ref={inputRef}
                type="text"
                value={query}
              />
              {query ? (
                <button
                  className="grid size-7 place-items-center rounded-lg text-text-quaternary transition-colors hover:bg-white/[0.08] hover:text-text-secondary"
                  onClick={() => setQuery("")}
                  type="button"
                >
                  <RiCloseLine size={18} />
                </button>
              ) : (
                <kbd className="hidden rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-xs text-text-quaternary md:inline-block">
                  esc
                </kbd>
              )}
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto p-2" ref={listRef}>
              {filtered.length > 0 ? (
                filtered.map((conv, index) => (
                  <div
                    className={cn(
                      "group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                      index === selectedIndex
                        ? "bg-accent/10 text-text-primary"
                        : "text-text-secondary hover:bg-white/[0.04]",
                    )}
                    key={conv.id}
                    onClick={() => {
                      onLoadConversation(conv.id);
                      onClose();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onLoadConversation(conv.id);
                        onClose();
                      }
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    role="button"
                    tabIndex={0}
                  >
                    <RiChat3Line className="shrink-0 text-text-quaternary" size={16} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{conv.title}</div>
                      <div className="flex items-center gap-1.5 text-xs text-text-quaternary">
                        <RiTimeLine size={12} />
                        {formatRelativeTime(conv.updatedAt)}
                        <span className="text-text-quaternary/50">·</span>
                        <span className="truncate">{conv.model}</span>
                      </div>
                    </div>
                    <button
                      aria-label="Delete conversation"
                      className="grid size-7 shrink-0 place-items-center rounded-lg text-text-quaternary opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                      onClick={(e) => handleDelete(e, conv.id)}
                      type="button"
                    >
                      <RiDeleteBinLine size={15} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-text-quaternary">
                  {query ? "No conversations found" : "No conversations yet"}
                </div>
              )}
            </div>

            {/* Footer hints — desktop only */}
            {filtered.length > 0 ? (
              <div className="hidden items-center gap-4 border-t border-white/[0.06] px-4 py-2 text-xs text-text-quaternary md:flex">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-1 font-mono text-[10px]">
                    ↑↓
                  </kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-1 font-mono text-[10px]">
                    ↵
                  </kbd>
                  Open
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-1 font-mono text-[10px]">
                    esc
                  </kbd>
                  Close
                </span>
              </div>
            ) : null}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
