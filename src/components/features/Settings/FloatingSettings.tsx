import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Monitor, Info, Download } from 'lucide-react';
import FocusLock from 'react-focus-lock';
import AppearanceTab from './Tabs/AppearanceTab';
import UpdatesTab from './Tabs/UpdatesTab';
import AboutTab from './Tabs/AboutTab';

interface FloatingSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FloatingSettings: React.FC<FloatingSettingsProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('appearance');
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Handle click outside to close panel
  const handleClickOutside = useCallback((event: MouseEvent) => {
    // Close settings panel when clicking outside
    if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
      onClose();
    }
  }, [onClose]);
  
  // Set up click handlers and manage body scroll
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
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: <Monitor size={18} /> },
    { id: 'updates', label: 'Updates', icon: <Download size={18} /> },
    { id: 'about', label: 'About', icon: <Info size={18} /> }
  ];
  
  const renderContent = () => {
    switch (activeTab) {
      case 'appearance':
        return <AppearanceTab />;
      case 'updates':
        return <UpdatesTab />;
      case 'about':
        return <AboutTab />;
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
