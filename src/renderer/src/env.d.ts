/// <reference types="vite/client" />

interface Window {
  claude: {
    sendMessage: (messages: unknown[], options?: unknown) => Promise<unknown>;
    setApiKey: (apiKey: string) => Promise<{ success: boolean }>;
    validateApiKey: (apiKey: string) => Promise<{ success: boolean; data?: boolean; error?: { message: string } }>;
    hasStoredApiKey: () => Promise<{ success: boolean; data?: boolean }>;
    streamMessage: (messages: unknown[], options?: unknown) => void;
    onStreamChunk: (callback: (chunk: unknown) => void) => void;
    onStreamEnd: (callback: () => void) => void;
    onStreamError: (callback: (error: unknown) => void) => void;
    removeStreamListeners: () => void;
  };
}
