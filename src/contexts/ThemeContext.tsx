import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('theme');
        return (saved as Theme) || 'system';
    });

    useEffect(() => {
        localStorage.setItem('theme', theme);
        
        if (theme === 'system') {
            document.documentElement.classList.remove('dark', 'light');
        } else {
            document.documentElement.classList.remove('dark', 'light');
            document.documentElement.classList.add(theme);
        }
    }, [theme]);

    useEffect(() => {
        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = (e: MediaQueryListEvent) => {
                document.documentElement.classList.toggle('dark', e.matches);
            };
            
            mediaQuery.addEventListener('change', handleChange);
            document.documentElement.classList.toggle('dark', mediaQuery.matches);
            
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within ThemeProvider');
    return context;
};
