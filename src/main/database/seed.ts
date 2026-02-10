import type Database from 'better-sqlite3';

const CHAT_COUNT = 200;
const TOTAL_MESSAGES = 20_000;

const FIRST_NAMES = [
  'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank',
  'Ivy', 'Jack', 'Karen', 'Leo', 'Mona', 'Nick', 'Olivia', 'Paul',
  'Quinn', 'Rita', 'Sam', 'Tina', 'Uma', 'Vic', 'Wendy', 'Xander',
];

const CHAT_TOPICS = [
  'Project Update', 'Team Standup', 'Design Review', 'Bug Report',
  'Feature Request', 'Code Review', 'Sprint Planning', 'Retro Notes',
  'Deployment', 'Architecture', 'Performance', 'Security Audit',
  'Onboarding', 'Release Notes', 'Customer Feedback', 'Data Migration',
  'API Changes', 'Testing Strategy', 'Documentation', 'Infrastructure',
];

const MESSAGE_TEMPLATES = [
  'Hey, has anyone looked at the latest changes?',
  'I just pushed a fix for the issue we discussed.',
  'Can we schedule a meeting to talk about this?',
  'The build is passing now after the patch.',
  'I think we should refactor this module.',
  'Great work on the last sprint!',
  'Has anyone tested this on production yet?',
  'I found a potential issue with the current approach.',
  'Let me check the logs and get back to you.',
  'The performance metrics look much better now.',
  'We need to update the documentation for this.',
  'I agree with the proposed solution.',
  'Can someone review my pull request?',
  'The deadline for this is end of next week.',
  'I will handle the deployment tomorrow morning.',
  'This looks good to me, shipping it.',
  'We might want to add more test coverage here.',
  'The client reported a new issue today.',
  'I have a question about the data model.',
  'Let us sync up after lunch.',
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function reseedDatabase(db: Database.Database): void {
  db.exec('DELETE FROM messages');
  db.exec('DELETE FROM chats');
  db.exec("DELETE FROM messages_fts WHERE messages_fts MATCH '*'");
  seedDatabase(db, true);
}

export function seedDatabase(db: Database.Database, force = false): void {
  if (!force) {
    const count = db.prepare('SELECT COUNT(*) AS cnt FROM chats').get() as { cnt: number };
    if (count.cnt > 0) return;
  }

  const now = Date.now();
  const oneMonthMs = 30 * 24 * 60 * 60 * 1000;

  // Insert chats
  const insertChat = db.prepare(`
    INSERT INTO chats (title, lastMessageAt, unreadCount)
    VALUES (?, ?, ?)
  `);

  const insertMessage = db.prepare(`
    INSERT INTO messages (chatId, ts, sender, body)
    VALUES (?, ?, ?, ?)
  `);

  const insertFts = db.prepare(`
    INSERT INTO messages_fts (rowid, body)
    VALUES (?, ?)
  `);

  const updateChatTimestamp = db.prepare(`
    UPDATE chats SET lastMessageAt = ? WHERE id = ?
  `);

  const seed = db.transaction(() => {
    // Create chats
    const chatIds: number[] = [];
    for (let i = 0; i < CHAT_COUNT; i++) {
      const topic = randomElement(CHAT_TOPICS);
      const suffix = randomInt(1, 999);
      const title = `${topic} #${suffix}`;
      const unread = randomInt(0, 15);

      const result = insertChat.run(title, 0, unread);
      chatIds.push(result.lastInsertRowid as number);
    }

    // Distribute messages across chats
    // Give each chat at least a few messages, then distribute the rest randomly
    const messagesPerChat = new Array<number>(CHAT_COUNT).fill(0);
    let remaining = TOTAL_MESSAGES;

    // Guarantee at least 10 messages per chat
    for (let i = 0; i < CHAT_COUNT; i++) {
      const min = Math.min(10, remaining);
      messagesPerChat[i] = min;
      remaining -= min;
    }

    // Distribute remaining randomly
    while (remaining > 0) {
      const batch = Math.min(remaining, 50);
      const idx = randomInt(0, CHAT_COUNT - 1);
      messagesPerChat[idx]! += batch;
      remaining -= batch;
    }

    // Insert messages per chat
    for (let i = 0; i < CHAT_COUNT; i++) {
      const chatId = chatIds[i]!;
      const msgCount = messagesPerChat[i]!;
      let latestTs = 0;

      // Generate timestamps spread over the past month
      const baseTs = now - oneMonthMs;

      for (let j = 0; j < msgCount; j++) {
        const ts = baseTs + Math.floor((oneMonthMs * j) / msgCount) + randomInt(0, 60_000);
        const sender = randomElement(FIRST_NAMES);
        const body = randomElement(MESSAGE_TEMPLATES);

        const result = insertMessage.run(chatId, ts, sender, body);
        insertFts.run(result.lastInsertRowid, body);

        if (ts > latestTs) latestTs = ts;
      }

      if (latestTs > 0) {
        updateChatTimestamp.run(latestTs, chatId);
      }
    }
  });

  seed();
}
