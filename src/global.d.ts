/**
 * Global type definitions for the application
 */

interface Window {
  electronAPI: {
    // Add methods here as needed
  };
  
  appInfo: {
    version: string;
  };
  
  env: {
    OLLAMA_API_URL: string;
    platform: string;
  };
}
