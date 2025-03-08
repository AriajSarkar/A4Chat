import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Monitor, Info, Download, Moon, Sun, Monitor as SystemIcon, Check } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { UpdateChecker } from '../Update/UpdateChecker';
import type { Theme } from '../../../contexts/Theme/types';
import FocusLock from 'react-focus-lock';

interface FloatingSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FloatingSettings: React.FC<FloatingSettingsProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('appearance');
  const panelRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  
  // Use type assertion to fix the TypeScript error
  const appVersion = (window as any).appInfo?.version || '1.0.0';
  
  // Handle click outside to close panel and dropdown
  const handleClickOutside = useCallback((event: MouseEvent) => {
    // Close theme dropdown when clicking outside
    if (
      themeDropdownRef.current && 
      !themeDropdownRef.current.contains(event.target as Node) && 
      themeDropdownOpen
    ) {
      setThemeDropdownOpen(false);
    }
    
    // Close settings panel when clicking outside
    if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
      onClose();
    }
  }, [themeDropdownOpen, onClose]);
  
  // Close dropdowns and set up click handlers
  useEffect(() => {
    if (isOpen) {
      // Add event listener only when panel is open
      document.addEventListener('mousedown', handleClickOutside);
      
      // Prevent scrolling of background content when settings is open
      document.body.style.overflow = 'hidden';
      
      // Add class to main container for blur effect
      const appElement = document.getElementById('app');
      if (appElement) {
        appElement.classList.add('settings-open');
      }
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
      
      const appElement = document.getElementById('app');
      if (appElement) {
        appElement.classList.remove('settings-open');
      }
    };
  }, [isOpen, handleClickOutside]);
  
  // Handle escape key to close
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (themeDropdownOpen) {
          setThemeDropdownOpen(false);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose, themeDropdownOpen]);
  
  // Close dropdown when tab changes
  useEffect(() => {
    setThemeDropdownOpen(false);
  }, [activeTab]);
  
  if (!isOpen) return null;
  
  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: <Monitor size={18} /> },
    { id: 'updates', label: 'Updates', icon: <Download size={18} /> },
    { id: 'about', label: 'About', icon: <Info size={18} /> }
  ];
  
  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun size={16} /> },
    { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
    { value: 'system', label: 'System', icon: <SystemIcon size={16} /> }
  ];
  
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    setThemeDropdownOpen(false);
  };
  
  const getCurrentThemeIcon = () => {
    const currentTheme = themeOptions.find(option => option.value === theme);
    return currentTheme ? currentTheme.icon : themeOptions[0].icon;
  };
  
  const renderContent = () => {
    switch (activeTab) {
      case 'appearance':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-brand-900 dark:text-brand-100">
              Theme Settings
            </h3>
            
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Theme Preference
              </label>
              
              {/* Theme dropdown selector with improved positioning */}
              <div className="relative" ref={themeDropdownRef}>
                <button
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
                    aria-expanded={themeDropdownOpen}
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
                        className="text-gray-500 dark:text-gray-400"/>
                    </svg>
                  </span>
                </button>
                
                {/* Dropdown content - fixed positioning to avoid parent scrolling */}
                {themeDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1
                              bg-white dark:bg-gray-800 
                              border border-gray-200 dark:border-gray-700
                              rounded-lg shadow-lg overflow-hidden
                              z-50 animate-fade-in-up-short">
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
                )}
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-1">
                {theme === 'system' 
                  ? 'Uses your device settings to determine light or dark mode' 
                  : `The app will always use ${theme} mode regardless of system settings`}
              </p>
            </div>
          </div>
        );
      case 'updates':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-brand-900 dark:text-brand-100">
              Software Updates
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <p className="mb-4">Current version: <span className="font-semibold">{appVersion}</span></p>
              <UpdateChecker />
            </div>
          </div>
        );
      case 'about':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-brand-900 dark:text-brand-100">
              About A4Chat
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-3">
              <p>Version: {appVersion}</p>
              <p>An elegant chat interface for Ollama, built with modern web technologies.</p>
              <p>This application provides a seamless interface for interacting with Ollama language models.</p>
              <div className="pt-2">
                <a 
                  href="https://github.com/AriajSarkar/A4Chat" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                >
                  Visit GitHub Repository
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 3H21V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return createPortal(
    <FocusLock>
      <div 
        className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md z-[100]
                  transition-opacity duration-300 ease-in-out"
        aria-modal="true"
        role="dialog"
      >
        <div className="flex items-center justify-center h-full p-1">
          <div 
            ref={panelRef}
            className="bg-white dark:bg-gray-850 
                      rounded-xl shadow-xl 
                      border border-gray-200 dark:border-gray-700
                      w-full max-w-3xl max-h-[100vh] min-h-[20rem]
                      transition-all duration-300 transform
                      animate-scale-in"
          >
            <div className="flex flex-col md:flex-row h-full overflow-hidden">
              {/* Left sidebar for navigation */}
              <div className="w-full md:w-56 bg-gray-50 dark:bg-gray-900/50 
                             border-b md:border-b-0 md:border-r rounded-tl-xl rounded-bl-xl
                             max-w-3xl max-h-[100vh] min-h-[20rem]
                             border-gray-200 dark:border-gray-700/50 p-3 flex flex-col">
                <div className="flex justify-between items-center mb-4 p-2">
                  <h2 className="text-lg font-medium text-brand-900 dark:text-brand-100">Settings</h2>
                  <button 
                    onClick={onClose}
                    className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Close settings"
                  >
                    <X size={16} className="text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
                
                <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible
                               pb-2 md:pb-0 flex-1">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        flex-shrink-0
                        px-3 py-2.5 rounded-md flex items-center gap-2
                        text-sm font-medium transition-all duration-200
                        ${activeTab === tab.id 
                          ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300'}
                      `}
                    >
                      <span className={`${activeTab === tab.id ? 'text-brand-500 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {tab.icon}
                      </span>
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
              
              {/* Right content panel */}
              <div className="flex-1 p-5 overflow-y-auto">
                <div className="animate-fade-in-up h-full">
                  {renderContent()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FocusLock>,
    document.body
  );
};
