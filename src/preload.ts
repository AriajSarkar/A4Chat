import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('env', {
  OLLAMA_API_URL: process.env.VITE_OLLAMA_API_URL || 'http://localhost:11434/api'
});

declare global {
  interface Window {
    env: {
      OLLAMA_API_URL: string;
    };
  }
}

// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
