import React from 'react';

interface InlineCodeProps {
    children: React.ReactNode;
}

export const InlineCode: React.FC<InlineCodeProps> = ({ children }) => {
    return (
        <code className="px-2 py-1 rounded-md text-sm font-mono
                      bg-gray-100 dark:bg-gray-800/90
                      text-gray-800 dark:text-gray-200
                      border border-gray-200/50 dark:border-gray-700/50
                      inline-block my-1">
            {children}
        </code>
    );
};
