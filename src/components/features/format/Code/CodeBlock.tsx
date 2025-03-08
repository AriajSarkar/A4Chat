import React, { useEffect, useState } from 'react';
import { formatCode, highlightCode } from '../utils/PrismLanguages';
import { CheckCircle, Copy } from 'lucide-react';

interface CodeBlockProps {
    children: React.ReactNode;
    className?: string;
    inline?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ 
    children, 
    className = '', 
    inline = false 
}) => {
    const [copied, setCopied] = useState(false);
    
    // Extract language name from className (format: language-xxx)
    const languageMatch = className.match(/language-(\w+)/);
    const language = languageMatch ? languageMatch[1] : '';
    
    // Convert children to string
    const rawCode = Array.isArray(children) ? children.join('') : String(children || '');
    
    // Format the code for proper display
    const formattedCode = formatCode(rawCode, language);
    
    // Use useEffect to highlight the code after component mounts
    useEffect(() => {
        highlightCode();
    }, [formattedCode]);
    
    // Handle copy functionality with feedback
    const handleCopy = () => {
        navigator.clipboard.writeText(formattedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    // For inline code, return a simple span
    if (inline) {
        return <code className={className}>{formattedCode}</code>;
    }
    
    return (
        <div className="group relative rounded-lg overflow-hidden my-4">
            {/* Code block container with subtle gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50/80 to-gray-100/30 
                           dark:from-gray-900/80 dark:to-gray-950/30 opacity-70"></div>
            
            {/* Enhanced language tag with refined styling */}
            {language && (
                <div className="
                    absolute top-0 left-0 z-10
                    py-1.5 px-3.5 text-xs font-mono font-medium 
                    border-r border-b 
                    border-brand-200/70 dark:border-brand-800/70
                    bg-brand-50/80 dark:bg-brand-900/80 backdrop-blur-sm
                    text-brand-700 dark:text-brand-300
                    rounded-br-lg shadow-sm
                    flex items-center gap-1.5
                    transition-all duration-300 ease-in-out
                ">
                    <span className="w-2 h-2 rounded-full bg-brand-400 dark:bg-brand-500 opacity-70"></span>
                    {language}
                </div>
            )}
            
            <pre className={`
                relative p-5 pt-8 pb-4 overflow-x-auto 
                bg-gray-50/60 dark:bg-gray-900/60
                border border-gray-200/70 dark:border-gray-800/70
                rounded-lg shadow-sm
                ${className}
            `}>
                <code className={`language-${language || 'plaintext'} ${language ? '' : 'text-gray-800 dark:text-gray-300'} block`}>
                    {formattedCode}
                </code>
            </pre>
            
            {/* Enhanced copy button with feedback */}
            <button
                onClick={handleCopy}
                aria-label={copied ? "Copied!" : "Copy code"}
                title={copied ? "Copied!" : "Copy code"}
                className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100
                         bg-white/80 dark:bg-gray-800/80
                         hover:bg-brand-50 dark:hover:bg-brand-900/50
                         border border-gray-200/80 dark:border-gray-700/80
                         text-gray-500 dark:text-gray-400
                         hover:text-brand-600 dark:hover:text-brand-400
                         p-1.5 rounded-md
                         backdrop-blur-sm
                         transition-all duration-200
                         shadow-sm
                         transform hover:scale-105
                         hover:shadow-md
                         focus:outline-none focus:ring-2 focus:ring-brand-400/50
                         z-20">
                {copied ? 
                    <CheckCircle size={16} className="text-green-500" /> : 
                    <Copy size={16} />
                }
            </button>
        </div>
    );
};
