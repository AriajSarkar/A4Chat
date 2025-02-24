import React from 'react';
import { getPlatformReloadShortcut, getOllamaStartCommand } from '../../../utils/platform';

interface ServiceErrorProps {
    onRetry: () => void;
}

export const ServiceError: React.FC<ServiceErrorProps> = ({ onRetry }) => {
    const reloadShortcut = getPlatformReloadShortcut();
    const startCommand = getOllamaStartCommand();

    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg max-w-lg">
                <h3 className="text-lg font-medium text-red-800 mb-2">
                    Connection Refused: Ollama Service Not Running
                </h3>
                <p className="text-red-700 mb-4">
                    Could not connect to Ollama at localhost:11434. Please ensure the service is running:
                </p>
                <div className="bg-red-100 p-3 rounded text-red-900 font-mono text-sm mb-4">
                    {startCommand}
                </div>
                <p className="text-red-700 mb-4">
                    After starting the service:
                </p>
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={onRetry}
                        className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded"
                    >
                        Try Again
                    </button>
                    <div className="text-red-700 flex items-center">
                        or press <span className="font-mono mx-2 bg-red-100 px-2 py-1 rounded">{reloadShortcut}</span> to reload
                    </div>
                </div>
            </div>
        </div>
    );
};
