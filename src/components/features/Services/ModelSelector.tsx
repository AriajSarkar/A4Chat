import React, { useState, useRef, useEffect } from 'react';

interface ModelSelectorProps {
    model: string;
    availableModels: string[];
    onModelChange: (model: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
    model,
    availableModels,
    onModelChange
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative w-full mb-4" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2 text-left 
                         rounded-lg flex items-center justify-between
                         transition-all duration-200 ease-in-out group
                         bg-brand-50/50 hover:bg-brand-100/50
                         dark:bg-brand-900/20 dark:hover:bg-brand-800/30
                         text-brand-600 dark:text-brand-light
                         border border-brand-200/50 dark:border-brand-700/50"
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="w-2 h-2 rounded-full bg-brand-400 group-hover:animate-pulse flex-shrink-0"></span>
                    <span className="truncate">{model}</span>
                </div>
                <span className={`flex-shrink-0 ml-2 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    ▼
                </span>
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 
                             bg-white/95 dark:bg-gray-800/95 
                             backdrop-blur-sm rounded-lg shadow-lg
                             border border-brand-100 dark:border-brand-900/50">
                    <div className="py-1">
                        {availableModels.map((modelName) => (
                            <button
                                key={modelName}
                                onClick={() => {
                                    onModelChange(modelName);
                                    setIsOpen(false);
                                }}
                                className="w-full px-3 py-2 text-left 
                                        hover:bg-blue-50 dark:hover:bg-white/10
                                        transition-colors duration-150 
                                        text-blue-600 dark:text-gray-200
                                        flex items-center gap-2 min-w-0"
                            >
                                <span className={`w-2 h-2 rounded-full flex-shrink-0
                                              ${model === modelName ? 'bg-green-500' : 'bg-gray-500'}
                                              group-hover:bg-green-500/50`}>
                                </span>
                                <span className="truncate">{modelName}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
