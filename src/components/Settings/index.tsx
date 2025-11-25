import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getApiKey, setApiKey } from '../../lib/api/config';
import { RiEyeLine, RiEyeOffLine } from '@remixicon/react';

export const Settings = () => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteStatus, setDeleteStatus] = useState<string | null>(null);

    const [apiKey, setApiKeyValue] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Load API key on mount
    useEffect(() => {
        const loadApiKey = async () => {
            try {
                const key = await getApiKey();
                setApiKeyValue(key);
            } catch (error) {
                console.error('Failed to load API key:', error);
            }
        };
        loadApiKey();
    }, []);

    const handleSaveApiKey = async () => {
        setIsSaving(true);
        setSaveStatus(null);

        try {
            await setApiKey(apiKey);
            setSaveStatus({ type: 'success', message: 'API key saved successfully!' });
            setTimeout(() => setSaveStatus(null), 3000);
        } catch (error) {
            console.error('Failed to save API key:', error);
            setSaveStatus({ type: 'error', message: `Error: ${error}` });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAllData = async () => {
        if (!confirm("Are you sure you want to delete ALL data? This cannot be undone.")) {
            return;
        }

        setIsDeleting(true);
        setDeleteStatus(null);

        try {
            await invoke('delete_all_data');
            setDeleteStatus("Data deleted successfully.");
            window.location.reload();
        } catch (error) {
            console.error("Failed to delete data:", error);
            setDeleteStatus(`Error: ${error}`);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-[var(--brand-1)]">Settings</h1>

            {/* API Configuration */}
            <div className="bg-white/5 p-6 rounded-lg border border-white/10 mb-6">
                <h2 className="text-xl font-semibold mb-4 text-white">API Configuration</h2>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        OpenRouter API Key
                    </label>
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <input
                                type={showApiKey ? "text" : "password"}
                                value={apiKey}
                                onChange={(e) => setApiKeyValue(e.target.value)}
                                placeholder="sk-or-v1-..."
                                className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded text-white placeholder-gray-500 focus:outline-none focus:border-[var(--brand-1)]"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                            >
                                {showApiKey ? <RiEyeOffLine size={20} /> : <RiEyeLine size={20} />}
                            </button>
                        </div>
                        <button
                            onClick={handleSaveApiKey}
                            disabled={isSaving || !apiKey.trim()}
                            className="px-4 py-2 bg-[var(--brand-1)] hover:bg-[var(--brand-1-hover)] text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? "Saving..." : "Save"}
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Get your API key from{' '}
                        <a
                            href="https://openrouter.ai/keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--brand-1)] hover:underline"
                        >
                            openrouter.ai/keys
                        </a>
                    </p>
                </div>

                {saveStatus && (
                    <p className={`text-sm ${saveStatus.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                        {saveStatus.message}
                    </p>
                )}
            </div>

            {/* Danger Zone */}
            <div className="bg-white/5 p-6 rounded-lg border border-white/10">
                <h2 className="text-xl font-semibold mb-4 text-red-400">Danger Zone</h2>
                <p className="text-gray-400 mb-4">
                    Deleting all data will remove all conversations, messages, and history.
                    This action is irreversible.
                </p>

                <button
                    onClick={handleDeleteAllData}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded transition-colors disabled:opacity-50"
                >
                    {isDeleting ? "Deleting..." : "Delete All Data"}
                </button>

                {deleteStatus && (
                    <p className="mt-4 text-sm text-gray-300">{deleteStatus}</p>
                )}
            </div>
        </div>
    );
};
