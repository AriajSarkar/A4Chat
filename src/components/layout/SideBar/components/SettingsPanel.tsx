import React, { ReactElement, useState } from 'react';
import { FloatingSettings } from '../../../features/Settings/FloatingSettings';
import { Tooltip } from '../../../../styles/Tooltip';

interface SettingsPanelProps {
    isOpen: boolean;
    isCollapsed: boolean;
    onToggle: () => void;
    icon: ReactElement;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isCollapsed, onToggle, icon }) => {
    const [showSettings, setShowSettings] = useState(false);
    
    // Prevent multiple instances from opening
    const handleButtonClick = () => {
        if (!showSettings) {
            setShowSettings(true);
            onToggle();
        }
    };

    if (isCollapsed) {
        return (
            <>
                <Tooltip content="Settings">
                    <button
                        onClick={handleButtonClick}
                        disabled={showSettings} // Disable button when settings are open
                        className="w-10 h-10 
                                rounded-lg flex items-center justify-center 
                                text-brand-default dark:text-brand-light
                                hover:bg-brand-light/10 dark:hover:bg-white/10
                                disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {icon}
                    </button>
                </Tooltip>
                
                <FloatingSettings 
                    isOpen={showSettings} 
                    onClose={() => setShowSettings(false)} 
                />
            </>
        );
    }

    return (
        <div className="mt-auto">
            <button
                onClick={handleButtonClick}
                disabled={showSettings} // Disable button when settings are open
                className="w-full text-left px-3 py-2 rounded-lg 
                         flex items-center gap-2
                         text-brand-default dark:text-brand-light
                        hover:bg-brand-light/10 dark:hover:bg-white/10
                        disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {icon}
                <span>Settings</span>
            </button>
            
            <FloatingSettings 
                isOpen={showSettings} 
                onClose={() => setShowSettings(false)} 
            />
        </div>
    );
};
