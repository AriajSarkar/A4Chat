// Make this file a proper module by adding an empty export
export {};

export interface IElectronAPI {
  // Add methods here
}

export interface AppInfo {
  version: string;
}

// Augment the Window interface in the global scope
declare global {
  interface Window {
    electronAPI: IElectronAPI;
    appInfo: AppInfo;
    env: {
      OLLAMA_API_URL: string;
      platform: string;
    };
  }
}
