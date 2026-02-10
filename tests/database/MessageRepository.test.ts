import type Database from 'better-sqlite3';
import { MessageRepository } from '../../src/main/database/MessageRepository';
import { setSecurityService, MockSecurityService } from '../../src/shared/security';
import { createTestDatabase, insertChat } from './helpers';

describe('MessageRepository', () => {
  let db: Database.Database;
  let repo: MessageRepository;
  let chatId: number;

  beforeAll(() => {
    // Initialize the security service singleton for tests
    setSecurityService(new MockSecurityService());
  });

  beforeEach(() => {
    db = createTestDatabase();
    repo = new MessageRepository(db);
    chatId = insertChat(db, 'Test Chat');
  });

  afterEach(() => {
    db.close();
  });

  describe('addMessage', () => {
    it('inserts a message and returns it with a valid id', () => {
      const msg = repo.addMessage(chatId, 'Alice', 'Hello World');

      expect(msg.id).toBeGreaterThan(0);
      expect(msg.chatId).toBe(chatId);
      expect(msg.sender).toBe('Alice');
      expect(msg.body).toBe('Hello World');
      expect(msg.ts).toBeGreaterThan(0);
    });

    it('returns plaintext body (not encrypted) to the caller', () => {
      const msg = repo.addMessage(chatId, 'Bob', 'Secret message');
      expect(msg.body).toBe('Secret message');
    });

    it('increments unreadCount on the parent chat', () => {
      const before = db.prepare('SELECT unreadCount FROM chats WHERE id = ?').get(chatId) as { unreadCount: number };
      repo.addMessage(chatId, 'Alice', 'msg1');
      repo.addMessage(chatId, 'Alice', 'msg2');
      const after = db.prepare('SELECT unreadCount FROM chats WHERE id = ?').get(chatId) as { unreadCount: number };

      expect(after.unreadCount).toBe(before.unreadCount + 2);
    });

    it('updates lastMessageAt on the parent chat', () => {
      const before = db.prepare('SELECT lastMessageAt FROM chats WHERE id = ?').get(chatId) as { lastMessageAt: number };
      repo.addMessage(chatId, 'Alice', 'new message');
      const after = db.prepare('SELECT lastMessageAt FROM chats WHERE id = ?').get(chatId) as { lastMessageAt: number };

      expect(after.lastMessageAt).toBeGreaterThanOrEqual(before.lastMessageAt);
    });
  });

  describe('getMessages', () => {
    it('returns messages ordered by ts descending (newest first)', () => {
      repo.addMessage(chatId, 'Alice', 'First');
      repo.addMessage(chatId, 'Bob', 'Second');
      repo.addMessage(chatId, 'Charlie', 'Third');

      const messages = repo.getMessages(chatId);
      expect(messages).toHaveLength(3);
      // Newest first
      expect(messages[0]!.ts).toBeGreaterThanOrEqual(messages[1]!.ts);
      expect(messages[1]!.ts).toBeGreaterThanOrEqual(messages[2]!.ts);
    });

    it('returns only messages for the specified chat', () => {
      const otherChatId = insertChat(db, 'Other Chat');
      repo.addMessage(chatId, 'Alice', 'Chat 1 message');
      repo.addMessage(otherChatId, 'Bob', 'Chat 2 message');

      const messages = repo.getMessages(chatId);
      expect(messages).toHaveLength(1);
      expect(messages[0]!.body).toBe('Chat 1 message');
    });

    it('respects limit and offset', () => {
      for (let i = 0; i < 10; i++) {
        repo.addMessage(chatId, 'Alice', `Message ${i}`);
      }

      const page1 = repo.getMessages(chatId, 3, 0);
      expect(page1).toHaveLength(3);

      const page2 = repo.getMessages(chatId, 3, 3);
      expect(page2).toHaveLength(3);

      // No overlap
      const ids1 = page1.map((m) => m.id);
      const ids2 = page2.map((m) => m.id);
      expect(ids1.filter((id) => ids2.includes(id))).toHaveLength(0);
    });

    it('decrypts message bodies on retrieval', () => {
      repo.addMessage(chatId, 'Alice', 'Plain text body');
      const messages = repo.getMessages(chatId);
      expect(messages[0]!.body).toBe('Plain text body');
    });
  });

  describe('searchMessages', () => {
    it('finds messages matching the FTS query', () => {
      repo.addMessage(chatId, 'Alice', 'The deployment went smoothly');
      repo.addMessage(chatId, 'Bob', 'We need to fix the login bug');

      const results = repo.searchMessages('deployment');
      expect(results).toHaveLength(1);
      expect(results[0]!.body).toContain('deployment');
    });

    it('returns chatTitle with each result', () => {
      repo.addMessage(chatId, 'Alice', 'Some searchable content');

      const results = repo.searchMessages('searchable');
      expect(results).toHaveLength(1);
      expect(results[0]!.chatTitle).toBe('Test Chat');
    });

    it('returns an empty array for no matches', () => {
      repo.addMessage(chatId, 'Alice', 'Hello world');

      const results = repo.searchMessages('xyznonexistent');
      expect(results).toHaveLength(0);
    });

    it('respects the limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        repo.addMessage(chatId, 'Alice', `Unique search term alpha ${i}`);
      }

      const results = repo.searchMessages('alpha', 3);
      expect(results).toHaveLength(3);
    });
  });
});
