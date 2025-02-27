import React, { ReactElement } from 'react';
import { ThemeSelector } from '../../../../contexts/Theme/ThemeSelector';

interface SettingsPanelProps {
    isOpen: boolean;
    isCollapsed: boolean;
    onToggle: () => void;
    icon: ReactElement;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, isCollapsed, onToggle, icon }) => {
    if (isCollapsed) {
        return (
            <button
                onClick={onToggle}
                title="Settings"
                className="w-10 h-10 
                        rounded-lg flex items-center justify-center 
                        text-brand-default dark:text-brand-light
                        hover:bg-brand-light/10 dark:hover:bg-white/10"
            >
                {icon}
            </button>
        );
    }

    return (
        <div className="mt-auto">
            <button
                onClick={onToggle}
                className="w-full text-left px-3 py-2 rounded-lg 
                         flex items-center gap-2
                         text-brand-default dark:text-brand-light
                        hover:bg-brand-light/10 dark:hover:bg-white/10"
            >
                {icon}
                <span>Settings</span>
            </button>
            
            {isOpen && (
                <div className="mt-2 pt-4 border-t border-brand-light/20 dark:border-gray-700">
                    <ThemeSelector />
                </div>
            )}
        </div>
    );
};
