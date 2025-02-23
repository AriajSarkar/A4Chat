import React from 'react';

interface ModelSelectorProps {
    model: string;
    availableModels: string[];
    onModelChange: (model: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
    model,
    availableModels,
    onModelChange
}) => {
    return (
        <select 
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full bg-white/10 text-white rounded-lg p-2 mb-4"
            aria-label="Select AI Model"
            title="AI Model Selection"
        >
            {availableModels.map(modelName => (
                <option key={modelName} value={modelName}>
                    {modelName}
                </option>
            ))}
        </select>
    );
};
