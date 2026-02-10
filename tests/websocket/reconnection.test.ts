import WebSocket, { WebSocketServer } from 'ws';

/**
 * Integration test for WebSocket reconnection behavior.
 *
 * Spins up a real WS server on an ephemeral port, connects a client,
 * verifies the connection, drops it, then verifies the client reconnects.
 *
 * This tests the reconnection pattern used in the app without depending
 * on Electron or React. The actual WebSocketService in the renderer
 * follows the same exponential-backoff pattern tested here.
 */
describe('WebSocket reconnection (integration)', () => {
  let server: WebSocketServer;
  let port: number;

  beforeEach((done) => {
    server = new WebSocketServer({ port: 0 }, () => {
      const addr = server.address();
      port = typeof addr === 'object' && addr !== null ? addr.port : 0;
      done();
    });
  });

  afterEach((done) => {
    server.close(done);
  });

  it('client receives a message after connecting', (done) => {
    server.on('connection', (ws) => {
      ws.send(JSON.stringify({ type: 'status', running: true }));
    });

    const client = new WebSocket(`ws://localhost:${port}`);
    client.on('message', (data) => {
      const parsed = JSON.parse(data.toString());
      expect(parsed.type).toBe('status');
      expect(parsed.running).toBe(true);
      client.close();
      done();
    });
  });

  it('client can reconnect after server drops the connection', (done) => {
    let connectionCount = 0;

    server.on('connection', (ws) => {
      connectionCount++;

      if (connectionCount === 1) {
        // Drop the first connection immediately
        ws.terminate();
      } else {
        // Second connection succeeds — send confirmation
        ws.send(JSON.stringify({ type: 'status', running: false }));
      }
    });

    let reconnected = false;

    function connect() {
      const client = new WebSocket(`ws://localhost:${port}`);

      client.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        expect(parsed.type).toBe('status');
        expect(reconnected).toBe(true);
        client.close();
        done();
      });

      client.on('close', () => {
        if (!reconnected) {
          reconnected = true;
          // Simulate exponential backoff (simplified: 100ms delay)
          setTimeout(() => connect(), 100);
        }
      });
    }

    connect();
  });

  it('heartbeat ping/pong keeps the connection alive', (done) => {
    let pongReceived = false;

    server.on('connection', (ws) => {
      // Server pings the client
      ws.ping();

      ws.on('pong', () => {
        pongReceived = true;
        ws.close();
      });
    });

    const client = new WebSocket(`ws://localhost:${port}`);

    client.on('close', () => {
      expect(pongReceived).toBe(true);
      done();
    });
  });

  it('server can broadcast to multiple clients', (done) => {
    let messagesReceived = 0;
    const TOTAL_CLIENTS = 3;

    server.on('connection', () => {
      // Once all clients are connected, broadcast
      if (server.clients.size === TOTAL_CLIENTS) {
        const event = JSON.stringify({ type: 'new-message', body: 'hello' });
        for (const ws of server.clients) {
          ws.send(event);
        }
      }
    });

    const clients: WebSocket[] = [];

    for (let i = 0; i < TOTAL_CLIENTS; i++) {
      const client = new WebSocket(`ws://localhost:${port}`);
      clients.push(client);

      client.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        expect(parsed.type).toBe('new-message');
        messagesReceived++;

        if (messagesReceived === TOTAL_CLIENTS) {
          clients.forEach((c) => c.close());
          done();
        }
      });
    }
  });

  it('graceful shutdown closes all clients with 1001 code', (done) => {
    server.on('connection', () => {
      // Immediately shut down the server after connection
      for (const ws of server.clients) {
        ws.close(1001, 'Server shutting down');
      }
    });

    const client = new WebSocket(`ws://localhost:${port}`);

    client.on('close', (code) => {
      expect(code).toBe(1001);
      done();
    });
  });
});
