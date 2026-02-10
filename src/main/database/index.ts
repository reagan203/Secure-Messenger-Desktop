import { getDatabase, closeDatabase } from './db';
import { ChatRepository } from './ChatRepository';
import { MessageRepository } from './MessageRepository';
import { seedDatabase, reseedDatabase } from './seed';

export { closeDatabase } from './db';
export { ChatRepository } from './ChatRepository';
export { MessageRepository } from './MessageRepository';
export { seedDatabase, reseedDatabase } from './seed';

let chatRepo: ChatRepository | null = null;
let messageRepo: MessageRepository | null = null;

export function initDatabase(): void {
  const db = getDatabase();
  seedDatabase(db);
  chatRepo = new ChatRepository(db);
  messageRepo = new MessageRepository(db);
}

export function getChatRepository(): ChatRepository {
  if (!chatRepo) throw new Error('Database not initialized. Call initDatabase() first.');
  return chatRepo;
}

export function getMessageRepository(): MessageRepository {
  if (!messageRepo) throw new Error('Database not initialized. Call initDatabase() first.');
  return messageRepo;
}

export function reseed(): void {
  const db = getDatabase();
  reseedDatabase(db);
}
