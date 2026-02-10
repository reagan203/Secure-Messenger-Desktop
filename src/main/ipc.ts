import { ipcMain, BrowserWindow } from 'electron';
import type { SimulationServer } from './websocket';
import { getChatRepository, getMessageRepository, reseed } from './database';
import { sanitizeError } from '../shared/security';


function safeHandle(
  channel: string,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => unknown,
): void {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...args);
    } catch (err) {
      const safe = sanitizeError(err);
      throw new Error(safe.message);
    }
  });
}

export function registerIpcHandlers(server: SimulationServer): void {
  // --- Simulation controls ---

  safeHandle('sim:start', () => {
    server.startSimulation();
    return { ok: true };
  });

  safeHandle('sim:stop', () => {
    server.stopSimulation();
    return { ok: true };
  });

  safeHandle('sim:trigger-message', (_event, chatId?: unknown) => {
    const message = server.triggerMessage(chatId as number | undefined);
    return message;
  });

  safeHandle('sim:connection-drop', () => {
    server.simulateConnectionDrop();
    return { ok: true };
  });

  safeHandle('sim:status', () => {
    return server.getStatus();
  });

  // --- Data access ---

  safeHandle('db:get-chats', (_event, limit?: unknown, offset?: unknown) => {
    return getChatRepository().getChats(limit as number | undefined, offset as number | undefined);
  });

  safeHandle('db:get-messages', (_event, chatId: unknown, limit?: unknown, offset?: unknown) => {
    return getMessageRepository().getMessages(chatId as number, limit as number | undefined, offset as number | undefined);
  });

  safeHandle('db:search-messages', (_event, query: unknown, limit?: unknown) => {
    return getMessageRepository().searchMessages(query as string, limit as number | undefined);
  });

  safeHandle('db:mark-as-read', (_event, chatId: unknown) => {
    getChatRepository().markAsRead(chatId as number);
    return { ok: true };
  });

  safeHandle('db:reseed', () => {
    reseed();
    return { ok: true };
  });

  // Forward simulation events to all renderer windows
  server.onSimulationEvent((event) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('sim:event', event);
      }
    }
  });
}
