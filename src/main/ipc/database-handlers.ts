import { ipcMain } from "electron";
import {
  createConversation,
  listConversations,
  getMessages,
  addMessage,
  updateConversationTitle,
  deleteConversation,
} from "../services/database";

export function registerDatabaseHandlers(): void {
  ipcMain.handle("db:create-conversation", (_event, title?: string) => {
    return createConversation(title);
  });

  ipcMain.handle("db:list-conversations", () => {
    return listConversations();
  });

  ipcMain.handle("db:get-messages", (_event, conversationId: number) => {
    return getMessages(conversationId);
  });

  ipcMain.handle("db:add-message", (_event, conversationId: number, role: string, content: string) => {
    return addMessage(conversationId, role, content);
  });

  ipcMain.handle("db:update-conversation-title", (_event, conversationId: number, title: string) => {
    updateConversationTitle(conversationId, title);
  });

  ipcMain.handle("db:delete-conversation", (_event, conversationId: number) => {
    deleteConversation(conversationId);
  });
}
