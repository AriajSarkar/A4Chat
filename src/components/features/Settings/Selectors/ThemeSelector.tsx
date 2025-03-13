import React, { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Monitor as SystemIcon, Check } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import type { Theme } from '../../../../contexts/Theme/types';

export const ThemeSelector: React.FC = () => {
    const { theme, setTheme } = useTheme();
    const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
    const themeDropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Theme options configuration
    const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
        { value: 'light', label: 'Light', icon: <Sun size={16} /> },
        { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
        { value: 'system', label: 'System', icon: <SystemIcon size={16} /> }
    ];

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                themeDropdownRef.current &&
                !themeDropdownRef.current.contains(event.target as Node) &&
                themeDropdownOpen
            ) {
                setThemeDropdownOpen(false);
            }
        };

        if (themeDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [themeDropdownOpen]);

    // Handle escape key to close dropdown
    useEffect(() => {
        const handleEscapeKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && themeDropdownOpen) {
                setThemeDropdownOpen(false);
            }
        };

        document.addEventListener('keydown', handleEscapeKey);

        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [themeDropdownOpen]);

    // Update ARIA attributes directly using DOM manipulation
    useEffect(() => {
        if (buttonRef.current) {
            // Set attribute values as direct strings instead of expressions
            buttonRef.current.setAttribute('aria-expanded', themeDropdownOpen ? 'true' : 'false');
        }
    }, [themeDropdownOpen]);

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme);
        setThemeDropdownOpen(false);
    };

    const getCurrentThemeIcon = () => {
        const currentTheme = themeOptions.find(option => option.value === theme);
        return currentTheme ? currentTheme.icon : themeOptions[0].icon;
    };

    return (
        <div className="relative" ref={themeDropdownRef}>
            <button
                ref={buttonRef}
                id="theme-selector-button"
                type='button'
                onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 
                bg-white dark:bg-gray-800 
                border border-gray-200 dark:border-gray-700 
                rounded-lg shadow-sm text-sm
                transition-all duration-200
                hover:bg-gray-50 dark:hover:bg-gray-750
                focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500"
                aria-label="Select theme"
                aria-expanded="false"
                aria-controls="theme-options"
            >
                <div className="flex items-center gap-2">
                    <span className="flex-shrink-0 text-brand-500 dark:text-brand-400">
                        {getCurrentThemeIcon()}
                    </span>
                    <span className="capitalize text-gray-800 dark:text-gray-200">
                        {theme} Theme
                    </span>
                </div>
                <span className={`transition-transform duration-200 ${themeDropdownOpen ? 'rotate-180' : ''}`}>
                    <svg width="12" height="6" viewBox="0 0 12 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 0.5L6 5.5L11 0.5"
                            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                            className="text-gray-500 dark:text-gray-400" />
                    </svg>
                </span>
            </button>

            {/* Dropdown content - always render but conditionally hide for better accessibility */}
            <div 
                id="theme-options"
                className={`absolute left-0 right-0 top-full mt-1
                bg-white dark:bg-gray-800 
                border border-gray-200 dark:border-gray-700
                rounded-lg shadow-lg overflow-hidden
                z-50 animate-fade-in-up-short
                ${themeDropdownOpen ? 'block' : 'hidden'}`}
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="theme-selector-button"
            >
                {themeOptions.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => handleThemeChange(option.value)}
                        className={`
                            w-full flex items-center justify-between px-3 py-2.5
                            text-left text-sm transition-colors duration-150
                            hover:bg-gray-50 dark:hover:bg-gray-750
                            ${theme === option.value 
                                ? 'bg-gray-50 dark:bg-gray-700' 
                                : 'text-gray-700 dark:text-gray-300'}
                        `}
                        role="menuitem"
                    >
                        <div className="flex items-center gap-2">
                            <span className={`${theme === option.value ? 'text-brand-500 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                {option.icon}
                            </span>
                            <span className="capitalize">{option.label}</span>
                        </div>

                        {theme === option.value && (
                            <Check size={16} className="text-brand-500 dark:text-brand-400" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};
