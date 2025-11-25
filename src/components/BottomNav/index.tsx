import React from "react";
import {
    RiAddLine,
    RiSearchLine,
    RiMenuUnfoldLine,
    RiSettingsLine
} from "@remixicon/react";

interface BottomNavProps {
    onNewChat: () => void;
    onSearch: () => void;
    onToggleSidebar: () => void;
    onSettings: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
    onNewChat,
    onSearch,
    onToggleSidebar,
    onSettings
}) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#171717] border-t border-[#2d2d2d] flex items-center justify-around px-4 z-30">
            <button
                onClick={onNewChat}
                className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors"
            >
                <RiAddLine size={24} />
                <span className="text-[10px] font-medium">New Chat</span>
            </button>

            <button
                onClick={onSearch}
                className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors"
            >
                <RiSearchLine size={24} />
                <span className="text-[10px] font-medium">Search</span>
            </button>

            <button
                onClick={onToggleSidebar}
                className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors"
            >
                <RiMenuUnfoldLine size={24} />
                <span className="text-[10px] font-medium">Menu</span>
            </button>

            <button
                onClick={onSettings}
                className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors"
            >
                <RiSettingsLine size={24} />
                <span className="text-[10px] font-medium">Settings</span>
            </button>
        </div>
    );
};
