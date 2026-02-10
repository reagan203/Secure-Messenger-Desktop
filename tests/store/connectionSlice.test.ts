import connectionReducer, {
  setConnecting,
  setConnected,
  setDisconnected,
  setPingReceived,
  incrementReconnectAttempts,
  resetReconnectAttempts,
} from '../../src/renderer/store/connectionSlice';

describe('connectionSlice reducer', () => {
  const initialState = {
    status: 'disconnected' as const,
    lastPing: null,
    reconnectAttempts: 0,
    error: null,
  };

  it('returns the initial state', () => {
    const state = connectionReducer(undefined, { type: 'unknown' });
    expect(state).toEqual(initialState);
  });

  describe('setConnecting', () => {
    it('sets status to connecting and clears error', () => {
      const prev = { ...initialState, error: 'Some error' };
      const state = connectionReducer(prev, setConnecting());
      expect(state.status).toBe('connecting');
      expect(state.error).toBeNull();
    });
  });

  describe('setConnected', () => {
    it('sets status to connected and resets reconnect attempts', () => {
      const prev = { ...initialState, status: 'connecting' as const, reconnectAttempts: 5, error: 'timeout' };
      const state = connectionReducer(prev, setConnected());
      expect(state.status).toBe('connected');
      expect(state.reconnectAttempts).toBe(0);
      expect(state.error).toBeNull();
    });
  });

  describe('setDisconnected', () => {
    it('sets status to disconnected with an error message', () => {
      const state = connectionReducer(initialState, setDisconnected('Connection lost'));
      expect(state.status).toBe('disconnected');
      expect(state.error).toBe('Connection lost');
    });

    it('sets error to null when no message is provided', () => {
      const state = connectionReducer(initialState, setDisconnected());
      expect(state.status).toBe('disconnected');
      expect(state.error).toBeNull();
    });
  });

  describe('setPingReceived', () => {
    it('sets lastPing to a recent timestamp', () => {
      const before = Date.now();
      const state = connectionReducer(initialState, setPingReceived());
      const after = Date.now();
      expect(state.lastPing).toBeGreaterThanOrEqual(before);
      expect(state.lastPing).toBeLessThanOrEqual(after);
    });
  });

  describe('incrementReconnectAttempts', () => {
    it('increments reconnectAttempts by 1', () => {
      let state = connectionReducer(initialState, incrementReconnectAttempts());
      expect(state.reconnectAttempts).toBe(1);

      state = connectionReducer(state, incrementReconnectAttempts());
      expect(state.reconnectAttempts).toBe(2);
    });
  });

  describe('resetReconnectAttempts', () => {
    it('resets reconnectAttempts to 0', () => {
      const prev = { ...initialState, reconnectAttempts: 10 };
      const state = connectionReducer(prev, resetReconnectAttempts());
      expect(state.reconnectAttempts).toBe(0);
    });
  });

  describe('state transitions', () => {
    it('handles a full connect → disconnect → reconnect cycle', () => {
      let state = connectionReducer(initialState, setConnecting());
      expect(state.status).toBe('connecting');

      state = connectionReducer(state, setConnected());
      expect(state.status).toBe('connected');

      state = connectionReducer(state, setDisconnected('Connection lost'));
      expect(state.status).toBe('disconnected');
      expect(state.error).toBe('Connection lost');

      state = connectionReducer(state, incrementReconnectAttempts());
      state = connectionReducer(state, setConnecting());
      expect(state.reconnectAttempts).toBe(1);

      state = connectionReducer(state, setConnected());
      expect(state.status).toBe('connected');
      expect(state.reconnectAttempts).toBe(0);
      expect(state.error).toBeNull();
    });
  });
});
