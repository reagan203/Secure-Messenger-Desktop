import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (channel: string, data: unknown) => {
    const validChannels = ['toMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  onMessage: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = ['fromMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  },

  // Simulation controls
  simStart: () => ipcRenderer.invoke('sim:start'),
  simStop: () => ipcRenderer.invoke('sim:stop'),
  simTriggerMessage: (chatId?: number) => ipcRenderer.invoke('sim:trigger-message', chatId),
  simConnectionDrop: () => ipcRenderer.invoke('sim:connection-drop'),
  simStatus: () => ipcRenderer.invoke('sim:status'),

  // Simulation event listener
  onSimEvent: (callback: (event: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data);
    ipcRenderer.on('sim:event', listener);
    return () => {
      ipcRenderer.removeListener('sim:event', listener);
    };
  },

  // Data access
  getChats: (limit?: number, offset?: number) =>
    ipcRenderer.invoke('db:get-chats', limit, offset),
  getMessages: (chatId: number, limit?: number, offset?: number) =>
    ipcRenderer.invoke('db:get-messages', chatId, limit, offset),
  searchMessages: (query: string, limit?: number) =>
    ipcRenderer.invoke('db:search-messages', query, limit),
  markChatAsRead: (chatId: number) =>
    ipcRenderer.invoke('db:mark-as-read', chatId),
  reseedDatabase: () =>
    ipcRenderer.invoke('db:reseed'),
});
