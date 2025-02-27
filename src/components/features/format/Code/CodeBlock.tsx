import React, { useEffect } from 'react';
import { formatCode, highlightCode } from '../utils/PrismLanguages';

interface CodeBlockProps {
    inline?: boolean;
    className?: string;
    children: React.ReactNode;
}

export const CodeBlock: React.FC<
    Omit<React.HTMLProps<HTMLElement>, keyof CodeBlockProps> & CodeBlockProps
> = ({ inline, className, children }) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const stringContent = String(children || '');
    
    // Format the code
    const formattedCode = !inline ? formatCode(stringContent, language) : stringContent;
    
    useEffect(() => {
        if (!inline) {
            highlightCode(formattedCode, language);
        }
    }, [formattedCode, inline, language]);

    if (inline) {
        return (
            <code className="px-1.5 py-0.5 rounded-md text-[0.9em] font-medium
                          bg-gray-100/80 dark:bg-gray-800/80 
                          text-gray-800 dark:text-gray-200
                          border border-gray-200/50 dark:border-gray-700/50
                          font-mono">
                {children}
            </code>
        );
    }

    return (
        <div className="not-prose relative group my-6 first:mt-0 last:mb-0">
            {language && (
                <div className="absolute top-0 right-0 px-3 py-2 text-xs 
                              font-mono text-gray-400 dark:text-gray-500 
                              uppercase tracking-wide z-10">
                    {language}
                </div>
            )}
            <pre className={`
                overflow-hidden rounded-xl shadow-lg
                bg-gray-900 dark:bg-gray-900/90
                border border-gray-700/50
                backdrop-blur-sm
            `}>
                <code className={`language-${language || 'text'} block p-5 pt-12 
                                overflow-x-auto text-[0.9em] leading-relaxed
                                font-mono`}>
                    {formattedCode}
                </code>
            </pre>
            <button
                onClick={() => navigator.clipboard.writeText(formattedCode)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100
                         bg-gray-700/30 hover:bg-gray-600/50
                         text-gray-300 hover:text-white
                         px-3 py-1.5 rounded-lg text-xs
                         backdrop-blur-sm
                         transition-all duration-200
                         font-medium z-20">
                Copy
            </button>
        </div>
    );
};
