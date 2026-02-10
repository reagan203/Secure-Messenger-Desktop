import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';

let db: Database.Database | null = null;

function getDbPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'app.db');
}

export function getDatabase(): Database.Database {
  if (db) return db;

  db = new Database(getDbPath());

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initSchema(db);

  return db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      lastMessageAt INTEGER NOT NULL DEFAULT 0,
      unreadCount INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chatId INTEGER NOT NULL,
      ts INTEGER NOT NULL,
      sender TEXT NOT NULL,
      body TEXT NOT NULL,
      FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_chat_ts
      ON messages(chatId, ts);

    CREATE INDEX IF NOT EXISTS idx_chats_last_message
      ON chats(lastMessageAt);
  `);

  // Create FTS5 virtual table for full-text search on message bodies
  // Wrap in try/catch since FTS5 may already exist and ALTER isn't supported
  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
        body,
        content='messages',
        content_rowid='id'
      );

      -- Triggers to keep FTS index in sync
      CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
        INSERT INTO messages_fts(rowid, body) VALUES (new.id, new.body);
      END;

      CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
        INSERT INTO messages_fts(messages_fts, rowid, body) VALUES('delete', old.id, old.body);
      END;

      CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
        INSERT INTO messages_fts(messages_fts, rowid, body) VALUES('delete', old.id, old.body);
        INSERT INTO messages_fts(rowid, body) VALUES (new.id, new.body);
      END;
    `);
  } catch {
    // FTS5 tables/triggers already exist
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
