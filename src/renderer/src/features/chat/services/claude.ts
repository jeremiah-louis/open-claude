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

/** Strip markdown formatting from a title (e.g. "# Title" or "**Title**") for tab display */
function stripTitleMarkdown(title: string): string {
  return title
    .trim()
    .replace(/^#+\s*/, "") // leading # ## ### etc.
    .replace(/\*\*(.+?)\*\*/g, "$1") // **bold**
    .replace(/\*(.+?)\*/g, "$1") // *italic*
    .replace(/^["']|["']$/g, "") // surrounding quotes
    .trim()
}

export async function generateTitle(userMessage: string): Promise<string> {
  const response = await window.claude.sendMessage(
    [{ role: "user", content: userMessage }],
    {
      system:
        "Generate a short title (6-7 words) for this conversation. Reply with ONLY the title text. No markdown, no headings, no formatting, no quotes, no explanation.",
      maxTokens: 25,
    },
  )
  const data = (response as { success: boolean; data?: { content?: { type: string; text: string }[] } }).data
  const block = data?.content?.[0]
  if (block?.type !== "text") return ""
  // Only take the first line — the model sometimes appends a description
  const firstLine = block.text.trim().split("\n")[0]
  return stripTitleMarkdown(firstLine ?? "")
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
