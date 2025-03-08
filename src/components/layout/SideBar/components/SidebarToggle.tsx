import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface SidebarToggleProps {
    isOpen: boolean;
    onToggle: () => void;
}

export const SidebarToggle: React.FC<SidebarToggleProps> = ({ isOpen, onToggle }) => {
    if (!isOpen) return null;
    
    return (
        <button 
            className="absolute -right-3 top-4 bg-gray-800 p-1.5 rounded-full 
                     shadow-lg border border-gray-700
                     hover:bg-gray-700 transition-all duration-200
                     group"
            onClick={onToggle}
            aria-label="Close sidebar"
        >
            <ChevronLeft size={16} />
        </button>
    );
};
