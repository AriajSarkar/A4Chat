import React, { ReactElement } from 'react';
import { Tooltip } from '../../../../styles/Tooltip';

interface NewChatButtonProps {
    onClick: () => void;
    isCollapsed: boolean;
    icon: ReactElement;
}

export const NewChatButton: React.FC<NewChatButtonProps> = ({ onClick, isCollapsed, icon }) => {
    if (isCollapsed) {
        return (
            <Tooltip content="New Chat">
                <button 
                    type='button'
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
            </Tooltip>
        );
    }

    return (
        <button 
            type='button'
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
