import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export const Settings = () => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteStatus, setDeleteStatus] = useState<string | null>(null);

    const handleDeleteAllData = async () => {
        if (!confirm("Are you sure you want to delete ALL data? This cannot be undone.")) {
            return;
        }

        setIsDeleting(true);
        setDeleteStatus(null);

        try {
            await invoke('delete_all_data');
            setDeleteStatus("Data deleted successfully.");
            // Optionally reload or clear local state
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
