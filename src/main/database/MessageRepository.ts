import type Database from 'better-sqlite3';
import type { Message } from '../../shared/types';
import { getSecurityService } from '../../shared/security';

/**
 * Repository for message CRUD.
 *
 * All message bodies are passed through SecurityService.encrypt() before
 * storage and SecurityService.decrypt() on retrieval, so the database
 * only ever contains transformed (in production: encrypted) text.
 *
 * The FTS index receives the *plaintext* body so full-text search still
 * works. In a real deployment with actual encryption, FTS would need a
 * different strategy (e.g. encrypted search index, or searching in-memory
 * after decryption). This is documented here as a known trade-off.
 */
export class MessageRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  getMessages(chatId: number, limit = 50, offset = 0): Message[] {
    const stmt = this.db.prepare(`
      SELECT id, chatId, ts, sender, body
      FROM messages
      WHERE chatId = ?
      ORDER BY ts DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(chatId, limit, offset) as Message[];
    return this.decryptMessages(rows);
  }

  addMessage(chatId: number, sender: string, body: string): Message {
    const security = getSecurityService();
    const ts = Date.now();
    const encryptedBody = security.encrypt(body);

    const insert = this.db.prepare(`
      INSERT INTO messages (chatId, ts, sender, body)
      VALUES (?, ?, ?, ?)
    `);

    const updateChat = this.db.prepare(`
      UPDATE chats
      SET lastMessageAt = ?, unreadCount = unreadCount + 1
      WHERE id = ?
    `);

    const addMessageTx = this.db.transaction(() => {
      const result = insert.run(chatId, ts, sender, encryptedBody);
      updateChat.run(ts, chatId);
      return result.lastInsertRowid as number;
    });

    const id = addMessageTx();

    // Return plaintext body to caller — never expose encrypted form over IPC
    return { id, chatId, ts, sender, body };
  }

  searchMessages(query: string, limit = 50): (Message & { chatTitle: string })[] {
    // NOTE: FTS index contains plaintext (see class-level docs).
    // With real encryption, this would need to search differently.
    const stmt = this.db.prepare(`
      SELECT m.id, m.chatId, m.ts, m.sender, m.body, c.title AS chatTitle
      FROM messages_fts
      JOIN messages m ON m.id = messages_fts.rowid
      JOIN chats c ON c.id = m.chatId
      WHERE messages_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `);
    const rows = stmt.all(query, limit) as (Message & { chatTitle: string })[];
    return this.decryptMessagesWithTitle(rows);
  }

  // --- Private helpers ---

  private decryptMessages(messages: Message[]): Message[] {
    const security = getSecurityService();
    for (const msg of messages) {
      msg.body = security.decrypt(msg.body);
    }
    return messages;
  }

  private decryptMessagesWithTitle(
    messages: (Message & { chatTitle: string })[],
  ): (Message & { chatTitle: string })[] {
    const security = getSecurityService();
    for (const msg of messages) {
      msg.body = security.decrypt(msg.body);
    }
    return messages;
  }
}
