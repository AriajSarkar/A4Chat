import { contextBridge } from 'electron';
import { app } from '@electron/remote';

// Get package version directly from app object instead of process.env
const appVersion = app.getVersion();

// Expose protected variables to renderer via contextBridge
contextBridge.exposeInMainWorld('electronAPI', {
  // Add other APIs as needed
});

contextBridge.exposeInMainWorld('env', {
  OLLAMA_API_URL: process.env.OLLAMA_API_URL || 'http://localhost:11434/api',
  platform: process.platform
});

// Expose version information in a safe way
contextBridge.exposeInMainWorld('appInfo', {
  version: appVersion
});

declare global {
  interface Window {
    env: {
      OLLAMA_API_URL: string;
      platform: string;
    };
    appInfo: {
      version: string;
    };
  }
}

// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
