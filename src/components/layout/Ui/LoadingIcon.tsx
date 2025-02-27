import React from 'react';

export const LoadingIcon: React.FC = () => {
    return (
        <div className="animate-spin w-5 h-5 border-2 border-brand-200 
                        border-t-brand-600 rounded-full
                        dark:border-brand-800 dark:border-t-brand-400" />
    );
};
