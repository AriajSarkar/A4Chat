export const getPlatformReloadShortcut = (): string => {
    if (window.env.platform === 'darwin') {
        return '⌘ + R';
    }
    return 'Ctrl + R';
};

export const getOllamaStartCommand = (): string => {
    if (window.env.platform === 'win32') {
        return 'Start Ollama from the Windows Start Menu';
    }
    if (window.env.platform === 'darwin') {
        return 'Run: ollama serve';
    }
    return 'Run: sudo systemctl start ollama';
};
