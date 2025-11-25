import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    RiMenuFoldLine,
    RiMenuUnfoldLine,
    RiAddLine,
    RiSearchLine,
    RiSettingsLine,
    RiQuestionLine
} from "@remixicon/react";
import { useMobile } from "../../hooks/use-mobile";

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
    onNavigateToSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle, onNavigateToSettings }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const isMobile = useMobile();

    // Mock chat history
    const chats = [
        { id: "1", title: "Message meaning explanation", preview: "What does omnipresent mean?" },
        { id: "2", title: "Female name in Japanese", preview: "Can you suggest some..." },
        { id: "3", title: "Google search limits", preview: "How many searches per day..." },
    ];

    // Close sidebar when switching to mobile if it was open (optional, but good UX)
    useEffect(() => {
        if (isMobile && !isCollapsed) {
            // We might want to start collapsed on mobile, but let's respect parent state for now
            // or maybe force collapse on mount if mobile?
            // For now, let's just let the parent control it, but we'll render differently.
        }
    }, [isMobile]);

    return (
        <>
            {/* Mobile Backdrop */}
            <AnimatePresence>
                {isMobile && !isCollapsed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onToggle}
                        className="fixed inset-0 bg-black/50 z-40"
                    />
                )}
            </AnimatePresence>

            {/* Mini Icon Sidebar (Hidden on mobile) */}
            <AnimatePresence>
                {isCollapsed && !isMobile && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="w-16 h-screen bg-[#171717] border-r border-[#2d2d2d] flex flex-col items-center py-3 gap-2"
                    >
                        <button
                            className="p-3 hover:bg-[#2d2d2d] rounded-lg transition-all text-gray-400 hover:text-white"
                            onClick={onToggle}
                            title="Open sidebar"
                        >
                            <RiMenuUnfoldLine size={20} />
                        </button>

                        <div className="w-10 h-px bg-[#2d2d2d] my-1" />

                        <button
                            className="p-3 hover:bg-[#2d2d2d] rounded-lg transition-all text-gray-400 hover:text-white"
                            onClick={() => window.location.reload()}
                            title="New chat"
                        >
                            <RiAddLine size={20} />
                        </button>

                        <button
                            className="p-3 hover:bg-[#2d2d2d] rounded-lg transition-all text-gray-400 hover:text-white"
                            title="Search chats"
                        >
                            <RiSearchLine size={20} />
                        </button>

                        <div className="flex-1" />

                        <button
                            className="p-3 hover:bg-[#2d2d2d] rounded-lg transition-all text-gray-400 hover:text-white"
                            title="Settings"
                            onClick={onNavigateToSettings}
                        >
                            <RiSettingsLine size={20} />
                        </button>

                        <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-medium">
                            LK
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Full Sidebar */}
            <motion.div
                className={`h-screen bg-[#171717] border-r border-[#2d2d2d] flex flex-col overflow-hidden ${isMobile ? "fixed inset-y-0 left-0 z-50 shadow-xl" : ""
                    }`}
                initial={false}
                animate={{
                    width: isCollapsed ? 0 : 260,
                    x: isMobile && isCollapsed ? -260 : 0 // Slide out on mobile
                }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
            >
                <AnimatePresence mode="wait">
                    {!isCollapsed && (
                        <motion.div
                            key="sidebar-content"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex flex-col h-full w-[260px]"
                        >
                            {/* Header */}
                            <div className="p-3 flex gap-2 border-b border-[#2d2d2d]">
                                <button
                                    className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-transparent border border-[#3d3d3d] rounded-lg text-white text-sm hover:bg-[#2d2d2d] transition-all"
                                    onClick={() => window.location.reload()}
                                >
                                    <RiAddLine size={18} />
                                    <span>New chat</span>
                                </button>
                                <button
                                    className="p-2.5 bg-transparent border-none text-gray-400 hover:bg-[#2d2d2d] hover:text-white rounded-md transition-all"
                                    onClick={onToggle}
                                >
                                    <RiMenuFoldLine size={20} />
                                </button>
                            </div>

                            {/* Search */}
                            <div className="p-3 relative">
                                <RiSearchLine size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search chats"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full py-2.5 pl-10 pr-3 bg-[#0d0d0d] border border-[#2d2d2d] rounded-lg text-white text-sm outline-none focus:border-brand-1 focus:bg-[#171717] transition-all placeholder:text-gray-500"
                                />
                            </div>

                            {/* Chat List */}
                            <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
                                <div className="text-xs font-medium text-gray-500 px-2 py-2 uppercase tracking-wide">
                                    Chats
                                </div>
                                {chats.map((chat) => (
                                    <button
                                        key={chat.id}
                                        className="w-full px-3 py-2.5 bg-transparent border-none rounded-lg text-white text-left hover:bg-[#2d2d2d] transition-all mb-1"
                                    >
                                        <div className="text-sm font-medium mb-1 truncate">{chat.title}</div>
                                        <div className="text-xs text-gray-400 truncate">{chat.preview}</div>
                                    </button>
                                ))}
                            </div>

                            {/* User Menu */}
                            <div className="p-3 border-t border-[#2d2d2d]">
                                <button
                                    onClick={onNavigateToSettings}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 bg-transparent border-none rounded-lg text-white text-sm hover:bg-[#2d2d2d] transition-all mb-1"
                                >
                                    <RiSettingsLine size={18} />
                                    <span>Settings</span>
                                </button>
                                <button className="w-full flex items-center gap-3 px-3 py-2.5 bg-transparent border-none rounded-lg text-white text-sm hover:bg-[#2d2d2d] transition-all">
                                    <RiQuestionLine size={18} />
                                    <span>Help</span>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </>
    );
};

