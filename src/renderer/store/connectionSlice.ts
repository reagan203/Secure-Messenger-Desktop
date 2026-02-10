import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

interface ConnectionState {
  status: ConnectionStatus;
  lastPing: number | null;
  reconnectAttempts: number;
  error: string | null;
}

const initialState: ConnectionState = {
  status: 'disconnected',
  lastPing: null,
  reconnectAttempts: 0,
  error: null,
};

const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    setConnecting(state) {
      state.status = 'connecting';
      state.error = null;
    },
    setConnected(state) {
      state.status = 'connected';
      state.reconnectAttempts = 0;
      state.error = null;
    },
    setDisconnected(state, action: PayloadAction<string | undefined>) {
      state.status = 'disconnected';
      state.error = action.payload ?? null;
    },
    setPingReceived(state) {
      state.lastPing = Date.now();
    },
    incrementReconnectAttempts(state) {
      state.reconnectAttempts += 1;
    },
    resetReconnectAttempts(state) {
      state.reconnectAttempts = 0;
    },
  },
});

export const {
  setConnecting,
  setConnected,
  setDisconnected,
  setPingReceived,
  incrementReconnectAttempts,
  resetReconnectAttempts,
} = connectionSlice.actions;

export default connectionSlice.reducer;
