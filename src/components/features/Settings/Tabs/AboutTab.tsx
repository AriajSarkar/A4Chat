import React from 'react';

const AboutTab: React.FC = () => {
  // Use type assertion to fix the TypeScript error
  const appVersion = (window as any).appInfo?.version || '1.0.0';

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
};

export default AboutTab;
