import React, { useState, useRef, useEffect } from 'react';
import { zIndex } from '../../../styles/zindex';
import { ChevronUp } from 'lucide-react';

interface ModelSelectorProps {
    model: string;
    availableModels: string[];
    onModelChange: (model: string) => void;
    compact?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
    model,
    availableModels,
    onModelChange,
    compact = false
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
        <div className={`relative ${compact ? 'w-auto' : 'w-full mb-4'}`} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    px-2 py-1 text-left 
                    rounded-lg flex items-center gap-1
                    transition-all duration-200 ease-in-out group
                    bg-brand-50/50 hover:bg-brand-100/50
                    dark:bg-brand-900/20 dark:hover:bg-brand-800/30
                    text-brand-600 dark:text-brand-light
                    border border-brand-200/50 dark:border-brand-700/50
                    ${compact ? 'text-xs' : 'text-sm w-full'}
                `}
                aria-label="Select model"
            >
                <div className="flex items-center gap-1 min-w-0 flex-1">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 
                        ${model ? 'bg-green-500' : 'bg-gray-400'} 
                        group-hover:animate-pulse`}
                    />
                    <span className="truncate">
                        {model || 'No models'}
                    </span>
                </div>
                <ChevronUp 
                    size={16} 
                    className={`flex-shrink-0 transition-transform duration-200 ${isOpen ? '' : 'rotate-180'}`}
                />
            </button>

            {isOpen && (
                <div className={`
                    absolute z-[${zIndex.dropdown}] 
                    ${compact ? 'bottom-full mb-1 left-0' : 'w-full mt-1'} 
                    bg-white/95 dark:bg-gray-800/95 
                    backdrop-blur-sm rounded-lg shadow-lg
                    border border-brand-100 dark:border-brand-900/50
                    max-h-56 overflow-y-auto
                    min-w-[160px]
                `}>
                    <div className="py-1">
                        {availableModels.map((modelName) => (
                            <button
                                key={modelName}
                                onClick={() => {
                                    onModelChange(modelName);
                                    setIsOpen(false);
                                }}
                                className={`
                                    w-full px-3 py-1.5 text-left 
                                    hover:bg-brand-50 dark:hover:bg-brand-900/30
                                    transition-colors duration-150 
                                    text-brand-600 dark:text-brand-light
                                    flex items-center gap-2 min-w-0
                                    ${compact ? 'text-xs' : ''}
                                `}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                                    ${model === modelName ? 'bg-green-500' : 'bg-gray-500'}
                                `} />
                                <span className="truncate">{modelName}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
