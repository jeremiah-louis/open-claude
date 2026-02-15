import Database from "better-sqlite3";
import { app } from "electron";
import * as path from "path";

let db: Database.Database | null = null;

export function initDatabase(): void {
  const dbPath = path.join(app.getPath("userData"), "chat-history.db");
  db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `);
}

function getDb(): Database.Database {
  if (!db) throw new Error("Database not initialized. Call initDatabase() first.");
  return db;
}

export function createConversation(title: string = ""): { id: number; title: string; createdAt: string } {
  const stmt = getDb().prepare("INSERT INTO conversations (title) VALUES (?)");
  const result = stmt.run(title);
  const row = getDb()
    .prepare("SELECT id, title, created_at as createdAt FROM conversations WHERE id = ?")
    .get(result.lastInsertRowid) as { id: number; title: string; createdAt: string };
  return row;
}

export function listConversations(): { id: number; title: string; createdAt: string }[] {
  return getDb()
    .prepare("SELECT id, title, created_at as createdAt FROM conversations ORDER BY created_at DESC")
    .all() as { id: number; title: string; createdAt: string }[];
}

export function getMessages(
  conversationId: number
): { id: number; conversationId: number; role: string; content: string; createdAt: string }[] {
  return getDb()
    .prepare(
      "SELECT id, conversation_id as conversationId, role, content, created_at as createdAt FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
    )
    .all(conversationId) as {
    id: number;
    conversationId: number;
    role: string;
    content: string;
    createdAt: string;
  }[];
}

export function addMessage(
  conversationId: number,
  role: string,
  content: string
): { id: number; conversationId: number; role: string; content: string; createdAt: string } {
  const stmt = getDb().prepare(
    "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)"
  );
  const result = stmt.run(conversationId, role, content);
  return getDb()
    .prepare(
      "SELECT id, conversation_id as conversationId, role, content, created_at as createdAt FROM messages WHERE id = ?"
    )
    .get(result.lastInsertRowid) as {
    id: number;
    conversationId: number;
    role: string;
    content: string;
    createdAt: string;
  };
}

export function updateConversationTitle(conversationId: number, title: string): void {
  getDb().prepare("UPDATE conversations SET title = ? WHERE id = ?").run(title, conversationId);
}

export function deleteConversation(conversationId: number): void {
  const d = getDb();
  d.prepare("DELETE FROM messages WHERE conversation_id = ?").run(conversationId);
  d.prepare("DELETE FROM conversations WHERE id = ?").run(conversationId);
}
