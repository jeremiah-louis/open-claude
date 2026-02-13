import Anthropic from "@anthropic-ai/sdk";
import { ClaudeApiError, ErrorCode } from "../../shared/errors";
import { storeApiKey, getStoredApiKey, clearApiKey } from "./secure-storage";

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

const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";
const DEFAULT_MAX_TOKENS = 1024;

let client: Anthropic | null = null;

export function setApiKey(apiKey: string): void {
  client = new Anthropic({ apiKey });
  storeApiKey(apiKey);
}

export function loadStoredApiKey(): boolean {
  const apiKey = getStoredApiKey();
  if (apiKey) {
    client = new Anthropic({ apiKey });
    return true;
  }
  return false;
}

export { clearApiKey };

function getClient(): Anthropic {
  if (!client) {
    throw new ClaudeApiError(
      "API key not set. Call setApiKey() first.",
      ErrorCode.API_KEY_NOT_SET,
      "claude:getClient",
    );
  }
  return client;
}

export async function sendMessage(
  messages: ChatMessage[],
  options?: SendMessageOptions,
): Promise<Anthropic.Message> {
  const anthropic = getClient();

  try {
    return await anthropic.messages.create({
      model: options?.model ?? DEFAULT_MODEL,
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: options?.system ?? undefined,
      temperature: options?.temperature ?? undefined,
      messages,
    });
  } catch (error) {
    throw ClaudeApiError.from(error, "claude:sendMessage");
  }
}

export function streamMessage(
  messages: ChatMessage[],
  options?: SendMessageOptions,
): AsyncIterable<Anthropic.MessageStreamEvent> {
  const anthropic = getClient();

  return anthropic.messages.stream({
    model: options?.model ?? DEFAULT_MODEL,
    max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
    system: options?.system ?? undefined,
    temperature: options?.temperature ?? undefined,
    messages,
  });
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const testClient = new Anthropic({ apiKey });
    await testClient.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 10,
      messages: [{ role: "user", content: "hi" }],
    });
    return true;
  } catch (error) {
    const apiError = ClaudeApiError.from(error, "claude:validateApiKey");
    // Authentication failure means the key is invalid — return false
    if (apiError.code === ErrorCode.API_KEY_INVALID) {
      return false;
    }
    // Other failures (network, rate limit, overloaded) should propagate
    throw apiError;
  }
}
