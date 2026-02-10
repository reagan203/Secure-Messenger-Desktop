// Database types

export interface Chat {
  id: number;
  title: string;
  lastMessageAt: number;
  unreadCount: number;
}

export interface Message {
  id: number;
  chatId: number;
  ts: number;
  sender: string;
  body: string;
}

// WebSocket / Simulation types

export type SimulationEvent =
  | { type: 'new-message'; message: Message; chatTitle: string }
  | { type: 'simulation-started' }
  | { type: 'simulation-stopped' }
  | { type: 'status'; running: boolean; clientCount: number; port: number };

export interface SimulationStatus {
  running: boolean;
  clientCount: number;
  port: number;
}

// Electron API exposed via preload

export interface ElectronAPI {
  sendMessage: (channel: string, data: unknown) => void;
  onMessage: (channel: string, callback: (...args: unknown[]) => void) => void;

  // Simulation controls
  simStart: () => Promise<{ ok: boolean }>;
  simStop: () => Promise<{ ok: boolean }>;
  simTriggerMessage: (chatId?: number) => Promise<Message | null>;
  simConnectionDrop: () => Promise<{ ok: boolean }>;
  simStatus: () => Promise<SimulationStatus>;
  onSimEvent: (callback: (event: SimulationEvent) => void) => () => void;

  // Data access
  getChats: (limit?: number, offset?: number) => Promise<Chat[]>;
  getMessages: (chatId: number, limit?: number, offset?: number) => Promise<Message[]>;
  searchMessages: (query: string, limit?: number) => Promise<(Message & { chatTitle: string })[]>;
  markChatAsRead: (chatId: number) => Promise<{ ok: boolean }>;
  reseedDatabase: () => Promise<{ ok: boolean }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
