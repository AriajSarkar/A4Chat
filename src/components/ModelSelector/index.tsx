import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RiSearchLine, RiArrowDownSLine } from "@remixicon/react";

interface Model {
    id: string;
    name: string;
    provider: string;
    icon?: string; // TODO: Add icon support
}

interface ModelSelectorProps {
    selectedModel: string;
    onSelectModel: (modelId: string) => void;
}

// Pre-defined OpenRouter models
const DEFAULT_MODELS: Model[] = [
    { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash", provider: "openrouter" },
    { id: "x-ai/grok-4.1-fast", name: "xAI: Grok 4.1 Fast", provider: "openrouter" },
    { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "openrouter" },
    { id: "openai/gpt-4", name: "GPT-4", provider: "openrouter" },
];

export const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onSelectModel }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredModels = DEFAULT_MODELS.filter(model =>
        model.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const currentModel = DEFAULT_MODELS.find(m => m.id === selectedModel);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] rounded-lg transition-all text-sm text-white"
            >
                <span className="font-medium">{currentModel?.name || "Select Model"}</span>
                <RiArrowDownSLine
                    size={16}
                    className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full left-0 mb-2 w-80 bg-[#1a1a1a] border border-[#2d2d2d] rounded-lg shadow-2xl overflow-hidden z-50"
                    >
                        {/* Search */}
                        <div className="p-3 border-b border-[#2d2d2d]">
                            <div className="relative">
                                <RiSearchLine
                                    size={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                                />
                                <input
                                    type="text"
                                    placeholder="Search models..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 bg-[#0d0d0d] border border-[#2d2d2d] rounded-lg text-white text-sm outline-none focus:border-brand-1 transition-all placeholder:text-gray-500"
                                />
                            </div>
                        </div>

                        {/* Model List */}
                        <div className="max-h-64 overflow-y-auto custom-scrollbar p-2">
                            {filteredModels.map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => {
                                        onSelectModel(model.id);
                                        setIsOpen(false);
                                        setSearchQuery("");
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${model.id === selectedModel
                                            ? "bg-brand-1 text-white"
                                            : "hover:bg-[#2d2d2d] text-white"
                                        }`}
                                >
                                    {/* TODO: Add model icon */}
                                    <div className="flex-1">
                                        <div className="text-sm font-medium">{model.name}</div>
                                        <div className="text-xs text-gray-400">{model.provider}</div>
                                    </div>
                                </button>
                            ))}

                            {filteredModels.length === 0 && (
                                <div className="text-center text-gray-500 py-4 text-sm">
                                    No models found
                                </div>
                            )}
                        </div>

                        {/* Add Custom Model Button */}
                        <div className="p-2 border-t border-[#2d2d2d]">
                            <button className="w-full px-3 py-2 text-sm text-brand-2 hover:bg-[#2d2d2d] rounded-lg transition-all text-left">
                                + Add custom model
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
