"use client";

import {
  RiAddLine,
  RiChat3Line,
  RiGithubFill,
  RiSearchLine,
  RiSettings3Line,
  RiSidebarFoldLine,
  RiSidebarUnfoldLine,
} from "@remixicon/react";
import { motion } from "motion/react";

import { APP_VERSION, GITHUB_URL } from "@/lib/app-meta";
import type { AppHealth } from "@/lib/native";
import { cn } from "@/lib/cn";

type NavigationSidebarProps = {
  expanded: boolean;
  health: AppHealth | null;
  onNewConversation: () => void;
  onOpenSettings: () => void;
  onToggleExpanded: () => void;
};

const items = [
  { label: "New chat", icon: RiAddLine, action: "new" },
  { label: "Search chats", icon: RiSearchLine, action: "search" },
  { label: "Conversations", icon: RiChat3Line, action: "conversation" },
] as const;

export function NavigationSidebar({
  expanded,
  health,
  onNewConversation,
  onOpenSettings,
  onToggleExpanded,
}: NavigationSidebarProps) {
  return (
    <motion.aside
      animate={{ width: expanded ? 320 : 72 }}
      className="hidden shrink-0 border-r border-white/10 bg-black md:flex"
      initial={false}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex min-h-0 w-full flex-col px-3 py-4">
        <div className="mb-6 flex items-center justify-between">
          <button
            aria-label="Toggle sidebar"
            className="grid size-10 place-items-center rounded-xl text-white/85 transition hover:bg-white/10"
            onClick={onToggleExpanded}
            type="button"
          >
            {expanded ? <RiSidebarFoldLine size={22} /> : <RiSidebarUnfoldLine size={22} />}
          </button>
          {expanded ? (
            <span className="pr-2 text-lg font-semibold tracking-normal">A4Chat</span>
          ) : null}
        </div>

        <nav className="flex flex-1 flex-col gap-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.action === "new";

            return (
              <button
                className={cn(
                  "flex h-12 items-center gap-3 rounded-xl px-3 text-left text-sm text-white/88 transition",
                  active ? "bg-white/12" : "hover:bg-white/8",
                  !expanded && "justify-center px-0",
                )}
                key={item.label}
                onClick={item.action === "new" ? onNewConversation : undefined}
                title={expanded ? undefined : item.label}
                type="button"
              >
                <Icon className="shrink-0" size={22} />
                {expanded ? <span>{item.label}</span> : null}
              </button>
            );
          })}

          {expanded ? (
            <div className="mt-7 min-h-0 flex-1 overflow-y-auto px-2 text-sm text-white/56">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent-soft">
                Recents
              </div>
              <div className="rounded-xl border border-white/8 px-3 py-4 text-white/48">
                No local chats yet
              </div>
            </div>
          ) : null}
        </nav>

        <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
          <button
            aria-label="Settings"
            className={cn(
              "flex h-11 items-center gap-3 rounded-xl px-3 text-sm text-white/82 transition hover:bg-white/10",
              !expanded && "justify-center px-0",
            )}
            onClick={onOpenSettings}
            title={expanded ? undefined : "Settings"}
            type="button"
          >
            <RiSettings3Line size={21} />
            {expanded ? <span>Settings</span> : null}
          </button>
          <a
            aria-label="GitHub repository"
            className={cn(
              "flex h-11 items-center gap-3 rounded-xl px-3 text-sm text-white/82 transition hover:bg-white/10",
              !expanded && "justify-center px-0",
            )}
            href={GITHUB_URL}
            rel="noreferrer"
            target="_blank"
            title={expanded ? undefined : "GitHub"}
          >
            <RiGithubFill size={21} />
            {expanded ? <span>GitHub</span> : null}
          </a>
          {expanded ? (
            <div className="px-3 pt-2 text-xs text-white/38">v{health?.version ?? APP_VERSION}</div>
          ) : null}
        </div>
      </div>
    </motion.aside>
  );
}
