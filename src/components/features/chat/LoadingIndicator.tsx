import React from 'react';

export const LoadingIndicator: React.FC = () => {
    return (
        <div className="bg-white border-b border-gray-200">
            <div className="max-w-3xl mx-auto px-4 py-6">
                <div className="flex items-center space-x-2 text-gray-400">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                </div>
            </div>
        </div>
    );
};
