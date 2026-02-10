import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { initDatabase, closeDatabase } from './database';
import { SimulationServer } from './websocket';
import { registerIpcHandlers } from './ipc';
import { setSecurityService, MockSecurityService } from '../shared/security';

const isDev = process.env.NODE_ENV === 'development';
const WS_PORT = 8080;

let simServer: SimulationServer | null = null;

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Warn when devtools are opened in production builds
  if (!isDev) {
    mainWindow.webContents.on('devtools-opened', () => {
      console.warn(
        '[security] DevTools opened in production build. ' +
        'Sensitive data may be visible in the console.',
      );
    });
  }

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  // Initialize security service (swap MockSecurityService for a real
  // implementation in production — see SecurityService.ts for guidance)
  setSecurityService(new MockSecurityService());

  initDatabase();

  simServer = new SimulationServer({ port: WS_PORT });
  simServer.start();
  registerIpcHandlers(simServer);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (simServer) {
    simServer.shutdown();
    simServer = null;
  }
  closeDatabase();
});
