import React from 'react';

interface TableRendererProps {
    children: React.ReactNode;
}

export const TableRenderer: React.FC<TableRendererProps> = ({ children }) => {
    return (
        <div className="overflow-x-auto my-6">
            <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg">
                {children}
            </table>
        </div>
    );
};

interface TableCellProps {
    isHeader?: boolean;
    children?: React.ReactNode;
}

export const TableCell: React.FC<TableCellProps> = ({ isHeader = false, children }) => {
    const Component = isHeader ? 'th' : 'td';
    
    return (
        <Component className={`
            py-3 px-4 text-sm
            ${isHeader 
                ? 'font-semibold bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300' 
                : 'font-normal text-gray-600 dark:text-gray-400'}
            ${!isHeader && 'border-t border-gray-200 dark:border-gray-700'}
        `}>
            {children}
        </Component>
    );
};
