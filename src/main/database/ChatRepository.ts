import type Database from 'better-sqlite3';
import type { Chat } from '../../shared/types';

export class ChatRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  getChats(limit = 50, offset = 0): Chat[] {
    const stmt = this.db.prepare(`
      SELECT id, title, lastMessageAt, unreadCount
      FROM chats
      ORDER BY lastMessageAt DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset) as Chat[];
  }

  getChatById(id: number): Chat | undefined {
    const stmt = this.db.prepare(`
      SELECT id, title, lastMessageAt, unreadCount
      FROM chats
      WHERE id = ?
    `);
    return stmt.get(id) as Chat | undefined;
  }

  updateChat(id: number, updates: Partial<Pick<Chat, 'title' | 'lastMessageAt' | 'unreadCount'>>): void {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.lastMessageAt !== undefined) {
      fields.push('lastMessageAt = ?');
      values.push(updates.lastMessageAt);
    }
    if (updates.unreadCount !== undefined) {
      fields.push('unreadCount = ?');
      values.push(updates.unreadCount);
    }

    if (fields.length === 0) return;

    values.push(id);
    const stmt = this.db.prepare(`UPDATE chats SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  }

  markAsRead(chatId: number): void {
    const stmt = this.db.prepare('UPDATE chats SET unreadCount = 0 WHERE id = ?');
    stmt.run(chatId);
  }
}
