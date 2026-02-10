import type Database from 'better-sqlite3';
import { ChatRepository } from '../../src/main/database/ChatRepository';
import { createTestDatabase, insertChat } from './helpers';

describe('ChatRepository', () => {
  let db: Database.Database;
  let repo: ChatRepository;

  beforeEach(() => {
    db = createTestDatabase();
    repo = new ChatRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('getChats', () => {
    it('returns an empty array when no chats exist', () => {
      const chats = repo.getChats();
      expect(chats).toEqual([]);
    });

    it('returns chats ordered by lastMessageAt descending', () => {
      const id1 = insertChat(db, 'Older Chat');
      db.prepare('UPDATE chats SET lastMessageAt = ? WHERE id = ?').run(1000, id1);

      const id2 = insertChat(db, 'Newer Chat');
      db.prepare('UPDATE chats SET lastMessageAt = ? WHERE id = ?').run(2000, id2);

      const chats = repo.getChats();
      expect(chats).toHaveLength(2);
      expect(chats[0]!.title).toBe('Newer Chat');
      expect(chats[1]!.title).toBe('Older Chat');
    });

    it('respects limit and offset', () => {
      for (let i = 0; i < 10; i++) {
        const id = insertChat(db, `Chat ${i}`);
        db.prepare('UPDATE chats SET lastMessageAt = ? WHERE id = ?').run(i * 1000, id);
      }

      const page1 = repo.getChats(3, 0);
      expect(page1).toHaveLength(3);

      const page2 = repo.getChats(3, 3);
      expect(page2).toHaveLength(3);

      // No overlap
      const ids1 = page1.map((c) => c.id);
      const ids2 = page2.map((c) => c.id);
      expect(ids1.filter((id) => ids2.includes(id))).toHaveLength(0);
    });
  });

  describe('getChatById', () => {
    it('returns the chat when it exists', () => {
      const id = insertChat(db, 'Test Chat');
      const chat = repo.getChatById(id);
      expect(chat).toBeDefined();
      expect(chat!.title).toBe('Test Chat');
    });

    it('returns undefined for a non-existent id', () => {
      const chat = repo.getChatById(99999);
      expect(chat).toBeUndefined();
    });
  });

  describe('updateChat', () => {
    it('updates the title', () => {
      const id = insertChat(db, 'Old Title');
      repo.updateChat(id, { title: 'New Title' });

      const chat = repo.getChatById(id);
      expect(chat!.title).toBe('New Title');
    });

    it('updates the unread count', () => {
      const id = insertChat(db, 'Chat', 5);
      repo.updateChat(id, { unreadCount: 10 });

      const chat = repo.getChatById(id);
      expect(chat!.unreadCount).toBe(10);
    });

    it('does nothing when no fields are provided', () => {
      const id = insertChat(db, 'Chat');
      const before = repo.getChatById(id);
      repo.updateChat(id, {});
      const after = repo.getChatById(id);
      expect(after).toEqual(before);
    });
  });

  describe('markAsRead', () => {
    it('sets unreadCount to 0', () => {
      const id = insertChat(db, 'Unread Chat', 7);
      expect(repo.getChatById(id)!.unreadCount).toBe(7);

      repo.markAsRead(id);
      expect(repo.getChatById(id)!.unreadCount).toBe(0);
    });
  });
});
