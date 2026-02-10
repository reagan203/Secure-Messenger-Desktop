import type { SimulationEvent } from '../../shared/types';
import type { AppDispatch } from '../store/store';
import {
  setConnecting,
  setConnected,
  setDisconnected,
  setPingReceived,
  incrementReconnectAttempts,
} from '../store/connectionSlice';
import { chatUpdatedByMessage } from '../store/chatsSlice';
import { messageReceived } from '../store/messagesSlice';

const BASE_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30_000;
const PING_INTERVAL = 10_000;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private dispatch: AppDispatch;
  private url: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private intentionalClose = false;

  constructor(dispatch: AppDispatch, url: string) {
    this.dispatch = dispatch;
    this.url = url;
  }

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.intentionalClose = false;
    this.dispatch(setConnecting());

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.dispatch(setConnected());
      this.startPing();
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data as string);
    };

    this.ws.onclose = () => {
      this.cleanup();
      if (!this.intentionalClose) {
        this.dispatch(setDisconnected('Connection lost'));
        this.scheduleReconnect();
      } else {
        this.dispatch(setDisconnected());
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror, so reconnect is handled there
    };
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.cancelReconnect();
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.dispatch(setDisconnected());
  }

  private handleMessage(raw: string): void {
    let event: SimulationEvent;
    try {
      event = JSON.parse(raw) as SimulationEvent;
    } catch {
      return;
    }

    switch (event.type) {
      case 'new-message':
        this.dispatch(messageReceived(event.message));
        this.dispatch(chatUpdatedByMessage({
          chatId: event.message.chatId,
          message: event.message,
          chatTitle: event.chatTitle,
        }));
        break;
      case 'status':
      case 'simulation-started':
      case 'simulation-stopped':
        // These are informational; connection state is managed by open/close
        break;
    }
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
        this.dispatch(setPingReceived());
      }
    }, PING_INTERVAL);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private cleanup(): void {
    this.stopPing();
  }

  /**
   * Schedule a reconnection attempt using exponential backoff.
   * Delay doubles each attempt: 1s → 2s → 4s → 8s → ... → capped at 30s.
   */
  private scheduleReconnect(): void {
    this.cancelReconnect();
    this.reconnectAttempts += 1;
    this.dispatch(incrementReconnectAttempts());

    // Exponential backoff: BASE * 2^(attempt-1), clamped to MAX
    const delay = Math.min(
      BASE_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1),
      MAX_RECONNECT_DELAY,
    );

    this.dispatch(setConnecting());
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
