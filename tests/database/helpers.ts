import Database from 'better-sqlite3';

/**
 * Create an in-memory SQLite database with the app schema.
 * Mirrors the schema from src/main/database/db.ts without
 * depending on Electron's `app` module.
 */
export function createTestDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

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

  // FTS5 virtual table
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
      body,
      content='messages',
      content_rowid='id'
    );

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

  return db;
}

/**
 * Insert a test chat and return its id.
 */
export function insertChat(db: Database.Database, title: string, unreadCount = 0): number {
  const result = db.prepare(
    'INSERT INTO chats (title, lastMessageAt, unreadCount) VALUES (?, ?, ?)',
  ).run(title, Date.now(), unreadCount);
  return result.lastInsertRowid as number;
}
