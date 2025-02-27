import React, { useState, useEffect } from 'react';
import { ModelSelector } from '../../../components/features/Services/ModelSelector';
import { NewChatButton } from './Sidebar-components/NewChatButton';
import { SettingsPanel } from './Sidebar-components/SettingsPanel';
import { MessageSquarePlus, Settings } from 'lucide-react';

interface SidebarProps {
    model: string;
    availableModels: string[];
    onModelChange: (model: string) => void;
    onNewChat: () => void;
    isOpen: boolean;
    onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    model,
    availableModels,
    onModelChange,
    onNewChat,
    isOpen,
    onToggle
}) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Add initial mount check
    useEffect(() => {
        // Check screen size on mount and set sidebar state
        if (window.innerWidth >= 1280 && !isOpen) {
            onToggle();
        }
    }, []); // Empty dependency array for mount only

    // Separate resize handler
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            if (width < 768 && isOpen) {
                onToggle();
            } else if (width >= 1280 && !isOpen) {
                onToggle();
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isOpen, onToggle]);

    const LogoButton = () => (
        <button 
            onClick={onToggle}
            className={`
                w-full h-16 flex items-center justify-center 
                hover:bg-brand-50 dark:hover:bg-brand-900/20
                transition-colors
                ${isOpen ? 'px-4 justify-start' : ''}
            `}
            aria-label={isOpen ? "Close Sidebar" : "Open Sidebar"}
        >
            <span className={`
                font-bold text-xl tracking-tight
                text-brand-600 dark:text-brand-light
                ${isOpen ? '' : 'transform -rotate-90'}
            `}>
                A4Chat
            </span>
        </button>
    );

    return (
        <>
            <div 
                className={`
                    fixed top-0 left-0 h-screen
                    transform transition-all duration-300 ease-in-out
                    flex flex-col
                    shadow-lg
                    bg-white/90 dark:bg-gray-900/90 
                    border-r border-brand-100 dark:border-brand-900/50
                    backdrop-blur-md
                    ${isOpen ? 'w-64' : 'w-16'}
                    z-20
                `}
                role="navigation"
            >
                {isOpen ? (
                    <div className="flex flex-col h-full">
                        <LogoButton />
                        <div className="flex-1 flex flex-col overflow-hidden p-4">
                            <div className="space-y-4 flex-1 overflow-y-auto scrollbar-thin">
                                <NewChatButton 
                                    onClick={onNewChat} 
                                    isCollapsed={!isOpen}
                                    icon={<MessageSquarePlus className="text-gray-300" size={20} />}
                                />
                                <div className="animate-fade-in">
                                    <ModelSelector
                                        model={model}
                                        availableModels={availableModels}
                                        onModelChange={onModelChange}
                                    />
                                </div>
                            </div>

                            <div className="mt-auto pt-4 border-t border-gray-800">
                                <SettingsPanel 
                                    isOpen={isSettingsOpen}
                                    isCollapsed={!isOpen}
                                    onToggle={() => setIsSettingsOpen(!isSettingsOpen)}
                                    icon={<Settings className="text-gray-300" size={20} />}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center py-4">
                        <LogoButton />
                        <div className="mt-4">
                            <NewChatButton 
                                onClick={onNewChat} 
                                isCollapsed={true}
                                icon={<MessageSquarePlus className="text-gray-300" size={20} />}
                            />
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};
