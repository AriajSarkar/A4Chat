import React, { ReactNode, memo } from 'react';
import { Sidebar } from '../../SideBar/Sidebar';

interface ChatLayoutProps {
    children: ReactNode;
    sidebarProps: {
        model: string;
        availableModels: string[];
        onModelChange: (model: string) => void;
        onNewChat: () => void;
        onLoadChat: (chatId: number) => void;
        activeChatId?: number;
        isOpen: boolean;
        onToggle: () => void;
        refreshTrigger: number;
    };
    footerContent: ReactNode;
    isSidebarOpen: boolean;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({ 
    children, 
    sidebarProps, 
    footerContent, 
    isSidebarOpen 
}) => {
    return (
        <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 overflow-hidden">
            <Sidebar {...sidebarProps} />
            <main className={`
                flex-1 flex flex-col min-w-0
                transition-all duration-300 ease-in-out
                ${!isSidebarOpen ? 'pl-16' : 'pl-64'}
            `}>
                <div className="flex-1 overflow-y-auto" id="chat-scroll-container">
                    <div className="max-w-4xl mx-auto w-full px-4 py-6 pb-36">
                        {children}
                    </div>
                </div>
                <footer className={`
                    fixed bottom-0 left-0 right-0 z-10 py-2 px-4 
                    bg-white/90 dark:bg-gray-800/95 
                    backdrop-blur-md border-t border-gray-200 dark:border-gray-700
                    transition-all duration-300 ease-in-out
                    ${!isSidebarOpen ? 'ml-16' : 'ml-64'}
                `}>
                    <div className="max-w-4xl mx-auto w-full">
                        {footerContent}
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default memo(ChatLayout);
