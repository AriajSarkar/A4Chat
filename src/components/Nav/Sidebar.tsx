"use client";

import {
    RiAddLine,
    RiChat3Line,
    RiCheckboxCircleFill,
    RiCheckboxCircleLine,
    RiCloseLine,
    RiDeleteBinLine,
    RiEdit2Line,
    RiGithubFill,
    RiMore2Fill,
    RiSearchLine,
    RiSettings3Line,
    RiSidebarFoldLine,
    RiSidebarUnfoldLine,
} from "@remixicon/react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { APP_VERSION, GITHUB_URL } from "@/lib/AppMeta";
import { cn } from "@/lib/cn";
import {
    bulkDeleteConversations,
    deleteConversation,
    renameConversation,
    type AppHealth,
    type SavedConversation,
} from "@/lib/native";

type NavigationSidebarProps = {
    conversations: SavedConversation[];
    expanded: boolean;
    health: AppHealth | null;
    mobileOpen: boolean;
    onLoadConversation: (id: string) => void;
    onMobileClose: () => void;
    onNewConversation: () => void;
    onOpenSearch: () => void;
    onOpenSettings: () => void;
    onRefresh: () => void;
    onToggleExpanded: () => void;
};

export function NavigationSidebar({
    conversations,
    expanded,
    health,
    mobileOpen,
    onLoadConversation,
    onMobileClose,
    onNewConversation,
    onOpenSearch,
    onOpenSettings,
    onRefresh,
    onToggleExpanded,
}: NavigationSidebarProps) {
    const showLabels = expanded || mobileOpen;

    /* ── CRUD state ────────────────────────── */
    const [menuId, setMenuId] = useState<string | null>(null);
    const [editId, setEditId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const menuRef = useRef<HTMLDivElement>(null);
    const editRef = useRef<HTMLInputElement>(null);

    /* ── Bulk select state ──────────────────── */
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const handleNewChat = () => {
        onNewConversation();
        onMobileClose();
    };

    useEffect(() => {
        if (!menuId) return;
        function handleClick(e: PointerEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuId(null);
        }
        document.addEventListener("pointerdown", handleClick);
        return () => document.removeEventListener("pointerdown", handleClick);
    }, [menuId]);

    useEffect(() => {
        if (editId) requestAnimationFrame(() => editRef.current?.focus());
    }, [editId]);

    const handleRename = useCallback((id: string, title: string) => {
        setMenuId(null);
        setEditId(id);
        setEditValue(title);
    }, []);

    const commitRename = useCallback(async () => {
        if (editId && editValue.trim()) {
            await renameConversation(editId, editValue.trim());
            onRefresh();
        }
        setEditId(null);
        setEditValue("");
    }, [editId, editValue, onRefresh]);

    const handleSingleDelete = useCallback(
        async (id: string) => {
            setMenuId(null);
            await deleteConversation(id);
            onRefresh();
        },
        [onRefresh],
    );

    /* ── Bulk actions ───────────────────────── */
    const toggleSelect = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        setSelected(new Set(conversations.map((c) => c.id)));
    };

    const cancelSelect = () => {
        setSelectMode(false);
        setSelected(new Set());
    };

    const handleBulkDelete = async () => {
        if (selected.size === 0) return;
        await bulkDeleteConversations([...selected]);
        cancelSelect();
        onRefresh();
    };

    const sidebarContent = (
        <div className="safe-top safe-bottom flex h-full min-h-0 w-full flex-col px-3 py-4">
            {/* ── Top: Toggle / Close + Brand ── */}
            <div className="mb-3 flex items-center justify-between">
                <button
                    aria-label="Toggle sidebar"
                    className="text-text-secondary hidden size-10 place-items-center rounded-xl transition-colors hover:bg-white/8 lg:grid"
                    onClick={onToggleExpanded}
                    type="button"
                >
                    {expanded ? <RiSidebarFoldLine size={22} /> : <RiSidebarUnfoldLine size={22} />}
                </button>
                <button
                    aria-label="Close sidebar"
                    className="text-text-secondary grid size-10 place-items-center rounded-xl transition-colors hover:bg-white/8 lg:hidden"
                    onClick={onMobileClose}
                    type="button"
                >
                    <RiCloseLine size={24} />
                </button>
                <span
                    className={cn(
                        "text-lg font-semibold tracking-tight text-text-primary transition-opacity duration-200",
                        showLabels ? "opacity-100" : "pointer-events-none opacity-0 lg:hidden",
                    )}
                >
                    A4Chat
                </span>
            </div>

            {/* ── Quick actions ── */}
            <nav className="flex flex-col gap-1">
                <button
                    className={cn(
                        "group flex h-11 items-center gap-3 rounded-xl bg-linear-to-r from-accent/20 to-accent/10 px-3 text-sm font-medium text-accent-soft transition-all hover:from-accent/30 hover:to-accent/15 active:scale-[0.98]",
                        !showLabels && "justify-center px-0 lg:justify-center",
                    )}
                    onClick={handleNewChat}
                    title={showLabels ? undefined : "New chat"}
                    type="button"
                >
                    <RiAddLine className="shrink-0" size={20} />
                    <span
                        className={cn("truncate", showLabels ? "opacity-100" : "hidden lg:sr-only")}
                    >
                        New chat
                    </span>
                </button>

                <button
                    className={cn(
                        "group flex h-11 items-center gap-3 rounded-xl px-3 text-sm text-text-secondary transition-all hover:bg-white/6 hover:text-text-primary active:scale-[0.98]",
                        !showLabels && "justify-center px-0 lg:justify-center",
                    )}
                    onClick={() => {
                        onOpenSearch();
                        onMobileClose();
                    }}
                    title={showLabels ? undefined : "Search"}
                    type="button"
                >
                    <RiSearchLine className="shrink-0" size={20} />
                    <span
                        className={cn("truncate", showLabels ? "opacity-100" : "hidden lg:sr-only")}
                    >
                        Search
                    </span>
                </button>
            </nav>

            {/* ── Recents ── */}
            <div className="mt-4 min-h-0 flex-1 overflow-hidden">
                <div
                    className={cn(
                        "flex h-full flex-col transition-opacity duration-200",
                        showLabels ? "opacity-100" : "pointer-events-none opacity-0",
                    )}
                >
                    {/* Recents header with select/cancel */}
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-text-quaternary text-[11px] font-semibold tracking-[0.16em] uppercase">
                            Recents
                        </span>
                        {conversations.length > 0 ? (
                            <button
                                className="text-text-quaternary hover:text-text-secondary text-[11px] font-medium transition-colors"
                                onClick={selectMode ? cancelSelect : () => setSelectMode(true)}
                                type="button"
                            >
                                {selectMode ? "Cancel" : "Select"}
                            </button>
                        ) : null}
                    </div>

                    {/* Bulk action bar */}
                    <AnimatePresence>
                        {selectMode ? (
                            <motion.div
                                animate={{ height: "auto", opacity: 1 }}
                                className="mb-2 flex items-center gap-2 overflow-hidden"
                                exit={{ height: 0, opacity: 0 }}
                                initial={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                            >
                                <button
                                    className="text-text-secondary flex-1 rounded-lg border border-white/8 px-2.5 py-1.5 text-[12px] transition-colors hover:bg-white/6"
                                    onClick={selectAll}
                                    type="button"
                                >
                                    Select all
                                </button>
                                <button
                                    className={cn(
                                        "flex-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-all",
                                        selected.size > 0
                                            ? "bg-danger/15 text-danger hover:bg-danger/25"
                                            : "border border-white/8 text-text-quaternary",
                                    )}
                                    disabled={selected.size === 0}
                                    onClick={handleBulkDelete}
                                    type="button"
                                >
                                    Delete{selected.size > 0 ? ` (${selected.size})` : ""}
                                </button>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>

                    {/* Conversation list */}
                    {conversations.length > 0 ? (
                        <nav className="flex min-h-0 flex-1 scrollbar-thin flex-col gap-0.5 overflow-y-auto">
                            {conversations.map((conv) => (
                                <div className="group relative" key={conv.id}>
                                    {editId === conv.id ? (
                                        <div className="flex h-10 items-center gap-2 rounded-xl bg-white/6 px-3">
                                            <RiChat3Line
                                                className="text-text-quaternary shrink-0"
                                                size={16}
                                            />
                                            <input
                                                className="text-text-primary min-w-0 flex-1 bg-transparent text-sm outline-none"
                                                onBlur={commitRename}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") commitRename();
                                                    if (e.key === "Escape") {
                                                        setEditId(null);
                                                        setEditValue("");
                                                    }
                                                }}
                                                ref={editRef}
                                                value={editValue}
                                            />
                                        </div>
                                    ) : (
                                        <div
                                            className={cn(
                                                "flex h-10 w-full shrink-0 cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary",
                                                selectMode &&
                                                    selected.has(conv.id) &&
                                                    "bg-accent/8 text-accent-soft",
                                            )}
                                            onClick={() => {
                                                if (selectMode) {
                                                    toggleSelect(conv.id);
                                                    return;
                                                }
                                                onLoadConversation(conv.id);
                                                onMobileClose();
                                            }}
                                            role="button"
                                            tabIndex={0}
                                        >
                                            {selectMode ? (
                                                selected.has(conv.id) ? (
                                                    <RiCheckboxCircleFill
                                                        className="text-accent shrink-0"
                                                        size={18}
                                                    />
                                                ) : (
                                                    <RiCheckboxCircleLine
                                                        className="text-text-quaternary shrink-0"
                                                        size={18}
                                                    />
                                                )
                                            ) : (
                                                <RiChat3Line
                                                    className="text-text-quaternary shrink-0"
                                                    size={16}
                                                />
                                            )}
                                            <span className="min-w-0 flex-1 truncate">
                                                {conv.title}
                                            </span>
                                            {/* Three-dot menu — visible always on mobile, hover on desktop */}
                                            {!selectMode ? (
                                                <span
                                                    className="text-text-quaternary hover:text-text-secondary grid size-6 shrink-0 place-items-center rounded-lg opacity-100 transition-all hover:bg-white/8 lg:opacity-0 lg:group-hover:opacity-100"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMenuId(
                                                            menuId === conv.id ? null : conv.id,
                                                        );
                                                    }}
                                                    role="button"
                                                    tabIndex={-1}
                                                >
                                                    <RiMore2Fill size={14} />
                                                </span>
                                            ) : null}
                                        </div>
                                    )}

                                    {/* Context menu */}
                                    <AnimatePresence>
                                        {menuId === conv.id ? (
                                            <motion.div
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                className="bg-surface-2 absolute top-full right-0 z-50 mt-1 min-w-35 overflow-hidden rounded-xl border border-white/8 py-1 shadow-xl shadow-black/40 backdrop-blur-xl"
                                                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                                ref={menuRef}
                                                transition={{ duration: 0.12 }}
                                            >
                                                <button
                                                    className="text-text-secondary hover:text-text-primary flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors hover:bg-white/6"
                                                    onClick={() =>
                                                        handleRename(conv.id, conv.title)
                                                    }
                                                    type="button"
                                                >
                                                    <RiEdit2Line size={15} /> Rename
                                                </button>
                                                <button
                                                    className="text-danger hover:bg-danger/10 flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors"
                                                    onClick={() => handleSingleDelete(conv.id)}
                                                    type="button"
                                                >
                                                    <RiDeleteBinLine size={15} /> Delete
                                                </button>
                                            </motion.div>
                                        ) : null}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </nav>
                    ) : (
                        <div className="text-text-quaternary rounded-xl border border-dashed border-white/8 px-3 py-4 text-center text-sm">
                            No conversations yet
                        </div>
                    )}
                </div>
            </div>

            {/* ── Bottom: Settings, GitHub, Version ── */}
            <div className="mt-3 flex shrink-0 flex-col gap-1 border-t border-white/6 pt-3">
                <button
                    aria-label="Settings"
                    className={cn(
                        "flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary active:scale-[0.98]",
                        !showLabels && "justify-center px-0 lg:justify-center",
                    )}
                    onClick={() => {
                        onOpenSettings();
                        onMobileClose();
                    }}
                    title={showLabels ? undefined : "Settings"}
                    type="button"
                >
                    <RiSettings3Line size={20} />
                    <span className={cn(showLabels ? "opacity-100" : "hidden lg:sr-only")}>
                        Settings
                    </span>
                </button>
                <a
                    aria-label="GitHub"
                    className={cn(
                        "flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary",
                        !showLabels && "justify-center px-0 lg:justify-center",
                    )}
                    href={GITHUB_URL}
                    rel="noreferrer"
                    target="_blank"
                    title={showLabels ? undefined : "GitHub"}
                >
                    <RiGithubFill size={20} />
                    <span className={cn(showLabels ? "opacity-100" : "hidden lg:sr-only")}>
                        GitHub
                    </span>
                </a>
                <div
                    className={cn(
                        "px-3 pt-1 text-xs text-text-quaternary/60 transition-opacity duration-200",
                        showLabels ? "opacity-100" : "hidden",
                    )}
                >
                    v{health?.version ?? APP_VERSION}
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop sidebar */}
            <motion.aside
                animate={{ width: expanded ? 280 : 68 }}
                className="bg-surface-0 hidden shrink-0 overflow-hidden border-r border-white/6 lg:flex"
                initial={false}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
                {sidebarContent}
            </motion.aside>

            {/* Mobile drawer */}
            <AnimatePresence>
                {mobileOpen ? (
                    <>
                        <motion.div
                            animate={{ opacity: 1 }}
                            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
                            exit={{ opacity: 0 }}
                            initial={{ opacity: 0 }}
                            onClick={onMobileClose}
                            onTouchEnd={onMobileClose}
                        />
                        <motion.aside
                            animate={{ x: 0 }}
                            className="safe-left bg-surface-0 fixed inset-y-0 left-0 z-50 w-[min(280px,85vw)] touch-pan-y border-r border-white/6 lg:hidden"
                            drag="x"
                            dragConstraints={{ left: -280, right: 0 }}
                            dragElastic={0.1}
                            exit={{ x: "-100%" }}
                            initial={{ x: "-100%" }}
                            onDragEnd={(_e, info) => {
                                if (info.offset.x < -100 || info.velocity.x < -500) {
                                    onMobileClose();
                                }
                            }}
                            style={{ willChange: "transform" }}
                            transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
                        >
                            {sidebarContent}
                        </motion.aside>
                    </>
                ) : null}
            </AnimatePresence>
        </>
    );
}
