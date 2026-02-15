import { GetVersionsFn } from "@shared/types";

interface DbConversation {
  id: number;
  title: string;
  createdAt: string;
}

interface DbMessage {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: string;
}

// Type definition for the preload process
declare global {
  interface Window {
    context: {
      getVersions: GetVersionsFn;
      triggerIPC: () => void;
    };
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
    db: {
      createConversation: (title?: string) => Promise<DbConversation>;
      listConversations: () => Promise<DbConversation[]>;
      getMessages: (conversationId: number) => Promise<DbMessage[]>;
      addMessage: (conversationId: number, role: string, content: string) => Promise<DbMessage>;
      updateConversationTitle: (conversationId: number, title: string) => Promise<void>;
      deleteConversation: (conversationId: number) => Promise<void>;
    };
  }
}
