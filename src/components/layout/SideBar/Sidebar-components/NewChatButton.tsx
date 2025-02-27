import React, { ReactElement } from 'react';
import { zIndex } from '../../../../styles/zindex';

interface NewChatButtonProps {
    onClick: () => void;
    isCollapsed: boolean;
    icon: ReactElement;
}

export const NewChatButton: React.FC<NewChatButtonProps> = ({ onClick, isCollapsed, icon }) => {
    if (isCollapsed) {
        return (
            <div className="relative group">
                <button 
                    onClick={onClick}
                    className="w-10 h-10 
                             bg-brand-50/50 hover:bg-brand-100/50
                             dark:bg-brand-900/20 dark:hover:bg-brand-800/30
                             rounded-lg flex items-center justify-center
                             text-brand-default dark:text-brand-light
                             transition-all duration-200"
                >
                    {icon}
                </button>
                <div 
                    className={`
                        absolute left-full ml-2
                        opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100
                        transform -translate-y-1/2 top-1/2
                        transition-all duration-200 origin-left
                        z-[${zIndex.tooltip}]
                    `}
                >
                    {/* Changed Arrow Position */}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-1">
                        <div className="w-2 h-2 rotate-45 
                                        bg-gray-700"></div>
                    </div>
                    {/* Tooltip Content */}
                    <div className="bg-gray-700 
                                    text-gray-100
                                    text-sm rounded-md py-1.5 px-3 
                                    whitespace-nowrap shadow-lg
                                    border border-gray-700/50">
                        New Chat
                    </div>
                </div>
            </div>
        );
    }

    return (
        <button 
            className="w-full bg-brand-50/50 hover:bg-brand-100/50
                     dark:bg-brand-900/20 dark:hover:bg-brand-800/30
                     rounded-lg p-3 
                     text-left flex items-center gap-2 
                     text-brand-default dark:text-brand-light
                     transition-all duration-200"
            onClick={onClick}
        >
            {icon}
            <span>New Chat</span>
        </button>
    );
};
