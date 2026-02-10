import WebSocket, { WebSocketServer } from 'ws';
import { getMessageRepository, getChatRepository } from '../database';
import type { Message, SimulationEvent } from '../../shared/types';

export type { SimulationEvent };

export interface WsServerOptions {
  port: number;
  heartbeatIntervalMs?: number;
  simulationIntervalMs?: [min: number, max: number];
}

type ClientMeta = { isAlive: boolean };

const SENDERS = [
  'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank',
  'Ivy', 'Jack', 'Karen', 'Leo', 'Mona', 'Nick', 'Olivia', 'Paul',
];

const BODIES = [
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
  'Just finished the code review, looks solid.',
  'We should add error handling for edge cases.',
  'The API response times improved significantly.',
  'I noticed a regression in the latest build.',
  'Can we pair program on this feature tomorrow?',
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class SimulationServer {
  private wss: WebSocketServer | null = null;
  private clients = new Map<WebSocket, ClientMeta>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private simulationTimer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private port: number;
  private heartbeatIntervalMs: number;
  private simulationIntervalMs: [number, number];
  private chatIds: number[] = [];
  private onMessageCallback: ((event: SimulationEvent) => void) | null = null;

  constructor(options: WsServerOptions) {
    this.port = options.port;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 10_000;
    this.simulationIntervalMs = options.simulationIntervalMs ?? [1000, 3000];
  }

  /** Register a callback that fires on every simulation event (for IPC forwarding). */
  onSimulationEvent(cb: (event: SimulationEvent) => void): void {
    this.onMessageCallback = cb;
  }

  /** Start the WebSocket server and begin accepting connections. */
  start(): void {
    if (this.wss) return;

    this.wss = new WebSocketServer({ port: this.port });

    this.wss.on('connection', (ws) => {
      this.clients.set(ws, { isAlive: true });

      ws.on('pong', () => {
        const meta = this.clients.get(ws);
        if (meta) meta.isAlive = true;
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', () => {
        this.clients.delete(ws);
      });

      // Send current status to newly connected client
      this.sendTo(ws, {
        type: 'status',
        running: this.running,
        clientCount: this.clients.size,
        port: this.port,
      });
    });

    // Heartbeat: ping every client, drop those that didn't pong
    this.heartbeatTimer = setInterval(() => {
      for (const [ws, meta] of this.clients) {
        if (!meta.isAlive) {
          ws.terminate();
          this.clients.delete(ws);
          continue;
        }
        meta.isAlive = false;
        ws.ping();
      }
    }, this.heartbeatIntervalMs);

    // Cache chat IDs for random selection
    this.loadChatIds();
  }

  /** Gracefully shut down the server, closing all clients. */
  shutdown(): void {
    this.stopSimulation();

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.wss) {
      for (const [ws] of this.clients) {
        ws.close(1001, 'Server shutting down');
      }
      this.clients.clear();
      this.wss.close();
      this.wss = null;
    }
  }

  /** Start the message simulation loop. */
  startSimulation(): void {
    if (this.running) return;
    this.running = true;
    this.loadChatIds();
    this.scheduleNextMessage();

    const event: SimulationEvent = { type: 'simulation-started' };
    this.broadcast(event);
    this.emitEvent(event);
  }

  /** Stop the message simulation loop. */
  stopSimulation(): void {
    if (!this.running) return;
    this.running = false;

    if (this.simulationTimer) {
      clearTimeout(this.simulationTimer);
      this.simulationTimer = null;
    }

    const event: SimulationEvent = { type: 'simulation-stopped' };
    this.broadcast(event);
    this.emitEvent(event);
  }

  /** Manually trigger a single new message to a random (or specific) chat. */
  triggerMessage(chatId?: number): Message | null {
    const targetChatId = chatId ?? this.randomChatId();
    if (targetChatId === null) return null;
    return this.generateAndPersistMessage(targetChatId);
  }

  /** Simulate a connection drop: terminate all connected clients. */
  simulateConnectionDrop(): void {
    for (const [ws] of this.clients) {
      ws.terminate();
    }
    this.clients.clear();
  }

  /** Get current server status. */
  getStatus(): { running: boolean; clientCount: number; port: number } {
    return {
      running: this.running,
      clientCount: this.clients.size,
      port: this.port,
    };
  }

  // --- Private helpers ---

  private loadChatIds(): void {
    const chatRepo = getChatRepository();
    const chats = chatRepo.getChats(999, 0);
    this.chatIds = chats.map((c) => c.id);
  }

  private randomChatId(): number | null {
    if (this.chatIds.length === 0) return null;
    return randomElement(this.chatIds);
  }

  private generateAndPersistMessage(chatId: number): Message {
    const sender = randomElement(SENDERS);
    const body = randomElement(BODIES);

    const messageRepo = getMessageRepository();
    const message = messageRepo.addMessage(chatId, sender, body);

    const chatRepo = getChatRepository();
    const chat = chatRepo.getChatById(chatId);
    const chatTitle = chat?.title ?? 'Unknown';

    const event: SimulationEvent = {
      type: 'new-message',
      message,
      chatTitle,
    };
    this.broadcast(event);
    this.emitEvent(event);

    return message;
  }

  private scheduleNextMessage(): void {
    if (!this.running) return;

    const delay = randomInt(this.simulationIntervalMs[0], this.simulationIntervalMs[1]);
    this.simulationTimer = setTimeout(() => {
      const chatId = this.randomChatId();
      if (chatId !== null) {
        this.generateAndPersistMessage(chatId);
      }
      this.scheduleNextMessage();
    }, delay);
  }

  private broadcast(event: SimulationEvent): void {
    const data = JSON.stringify(event);
    for (const [ws] of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  private sendTo(ws: WebSocket, event: SimulationEvent): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }

  private emitEvent(event: SimulationEvent): void {
    this.onMessageCallback?.(event);
  }
}
