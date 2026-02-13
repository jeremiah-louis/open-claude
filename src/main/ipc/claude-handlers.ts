import { ipcMain } from "electron";
import * as claudeService from "../services/claude";
import { ClaudeApiError } from "../../shared/errors";

export function registerClaudeHandlers(): void {
  ipcMain.handle("claude:has-stored-api-key", async () => {
    try {
      const loaded = claudeService.loadStoredApiKey();
      return { success: true, data: loaded };
    } catch {
      return { success: true, data: false };
    }
  });

  ipcMain.handle("claude:send-message", async (_event, messages, options) => {
    try {
      const response = await claudeService.sendMessage(messages, options);
      return { success: true, data: response };
    } catch (error) {
      const apiError =
        error instanceof ClaudeApiError
          ? error
          : ClaudeApiError.from(error, "claude:send-message");
      return { success: false, error: apiError.toModel() };
    }
  });

  ipcMain.handle("claude:set-api-key", async (_event, apiKey: string) => {
    claudeService.setApiKey(apiKey);
    return { success: true };
  });

  ipcMain.handle("claude:validate-api-key", async (_event, apiKey: string) => {
    try {
      const valid = await claudeService.validateApiKey(apiKey);
      return { success: true, data: valid };
    } catch (error) {
      const apiError =
        error instanceof ClaudeApiError
          ? error
          : ClaudeApiError.from(error, "claude:validate-api-key");
      return { success: false, error: apiError.toModel() };
    }
  });

  // Streaming uses ipcMain.on + event.sender.send to push chunks back
  ipcMain.on("claude:stream-message", async (event, messages, options) => {
    try {
      const stream = claudeService.streamMessage(messages, options);
      for await (const chunk of stream) {
        if (event.sender.isDestroyed()) return;
        event.sender.send("claude:stream-chunk", chunk);
      }
      if (!event.sender.isDestroyed()) {
        event.sender.send("claude:stream-end");
      }
    } catch (error) {
      if (!event.sender.isDestroyed()) {
        const apiError =
          error instanceof ClaudeApiError
            ? error
            : ClaudeApiError.from(error, "claude:stream-message");
        event.sender.send("claude:stream-error", apiError.toModel());
      }
    }
  });
}
