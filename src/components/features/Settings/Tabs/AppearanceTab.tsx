import React from 'react';
import { ThemeSelector } from '../Selectors/ThemeSelector';
import { useTheme } from '../../../../contexts/ThemeContext';

const AppearanceTab: React.FC = () => {
    const { theme } = useTheme();

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-medium text-brand-900 dark:text-brand-100">
                Theme Settings
            </h3>

            <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Theme Preference
                </label>

                <ThemeSelector />

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-1">
                    {theme === 'system'
                        ? 'Uses your device settings to determine light or dark mode'
                        : `The app will always use ${theme} mode regardless of system settings`}
                </p>
            </div>
        </div>
    );
};

export default AppearanceTab;
