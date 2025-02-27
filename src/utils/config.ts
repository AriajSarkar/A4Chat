const CONFIG_KEY = 'app_config';

interface AppConfig {
    lastUsedModel?: string;
}

export const saveConfig = (config: AppConfig): void => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
};

export const loadConfig = (): AppConfig => {
    const stored = localStorage.getItem(CONFIG_KEY);
    return stored ? JSON.parse(stored) : {};
};

export const updateLastUsedModel = (model: string): void => {
    const config = loadConfig();
    saveConfig({ ...config, lastUsedModel: model });
};
