export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SendMessageOptions {
  model?: string;
  maxTokens?: number;
  system?: string;
  temperature?: number;
}

export async function sendMessage(messages: ChatMessage[], options?: SendMessageOptions) {
  return await window.claude.sendMessage(messages, options);
}

export async function setApiKey(apiKey: string) {
  return await window.claude.setApiKey(apiKey);
}

export async function validateApiKey(apiKey: string) {
  return await window.claude.validateApiKey(apiKey);
}

export function streamMessage(
  messages: ChatMessage[],
  options?: SendMessageOptions,
  callbacks?: {
    onChunk: (chunk: unknown) => void;
    onEnd: () => void;
    onError: (error: unknown) => void;
  }
) {
  if (callbacks) {
    window.claude.onStreamChunk(callbacks.onChunk);
    window.claude.onStreamEnd(callbacks.onEnd);
    window.claude.onStreamError(callbacks.onError);
  }
  window.claude.streamMessage(messages, options);

  // Return cleanup function
  return () => window.claude.removeStreamListeners();
}
