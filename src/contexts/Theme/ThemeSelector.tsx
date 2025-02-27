import React from 'react';
import { useTheme } from '../ThemeContext';
import type { Theme } from './types';

export const ThemeSelector: React.FC = () => {
    const { theme, setTheme } = useTheme();
    const themeOptions: Theme[] = ['light', 'dark', 'system'];

    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-brand-600 dark:text-brand-light">
                Theme
            </label>
            <div className="flex gap-2">
                {themeOptions.map((option) => (
                    <button
                        key={option}
                        onClick={() => setTheme(option)}
                        className={`
                            px-3 py-1.5 rounded-md text-sm
                            capitalize transition-colors duration-200
                            ${theme === option ? 
                                'bg-brand-500 text-white' : 
                                'text-brand-600 dark:text-brand-light hover:bg-brand-50 dark:hover:bg-brand-900/20'
                            }
                        `}
                    >
                        {option}
                    </button>
                ))}
            </div>
        </div>
    );
};
