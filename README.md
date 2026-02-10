# Electron React Chat Application

A real-time chat application built with Electron, React, TypeScript, Redux Toolkit, and SQLite. Features virtualized lists, WebSocket-driven message simulation, full-text search, and a security service layer.

## Setup

```bash
# Install dependencies
npm install

# Development (starts renderer dev server + Electron)
npm run dev

# Production build
npm run build

# Run the built app
npm start

# Package for distribution
npm run dist
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development mode (webpack dev server + Electron) |
| `npm run build` | Build both main and renderer for production |
| `npm start` | Build and launch the Electron app |
| `npm run dist` | Build and package with electron-builder |
| `npm test` | Run all Jest tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run typecheck` | Type-check both main and renderer without emitting |
| `npm run prod` | Full production pipeline: typecheck + test + build |

## Architecture

```
electron-react-app/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── main.ts              # App entry, window creation, security init
│   │   ├── preload.ts           # Secure IPC bridge (contextBridge)
│   │   ├── ipc.ts               # IPC handler registration with error sanitization
│   │   ├── database/
│   │   │   ├── db.ts            # SQLite singleton, schema, WAL mode
│   │   │   ├── ChatRepository.ts
│   │   │   ├── MessageRepository.ts  # Encrypt/decrypt via SecurityService
│   │   │   ├── seed.ts          # 200 chats, 20k messages seed data
│   │   │   └── index.ts         # Database facade
│   │   └── websocket/
│   │       ├── server.ts        # SimulationServer (WS + message generation)
│   │       └── index.ts
│   ├── renderer/                # React frontend
│   │   ├── index.tsx            # React root with Redux + MUI providers
│   │   ├── App.tsx              # Root layout with error boundaries
│   │   ├── App.css              # Global styles, responsive layout
│   │   ├── theme.ts             # MUI dark theme configuration
│   │   ├── store/database.ts       # Database API wrappers (calls to window.electronAPI) 
│   │   │   ├── store.ts         # Redux store configuration
│   │   │   ├── connectionSlice.ts  # WebSocket connection state
│   │   │   ├── chatsSlice.ts    # Chat list state + async thunks
│   │   │   ├── messagesSlice.ts # Per-chat messages + search
│   │   │   └── hooks.ts         # Typed useAppDispatch / useAppSelector
│   │   ├── services/
│   │   │   └── websocket.ts     # WS client with exponential backoff
│   │   ├── hooks/
│   │   │   └── useKeyboardShortcuts.ts  # Ctrl+K, Esc, Arrow keys
│   │   ├── components/
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── ChatList/        # Virtualized chat list (react-window)
│   │   │   └── MessageView/     # Message display + input
│   │   └── utils/               # Shared formatting + styles
│   └── shared/                  # Shared between main + renderer
│       ├── types.ts             # Chat, Message, SimulationEvent, ElectronAPI
│       └── security/
│           ├── SecurityService.ts  # ISecurityService + MockSecurityService
│           ├── sanitize.ts      # sanitizeError, redactForLog
│           └── index.ts
├── tests/
│   ├── database/                # SQLite repository tests (in-memory)
│   ├── store/                   # Redux reducer tests
│   ├── security/                # SecurityService + sanitize tests
│   └── websocket/               # WS reconnection integration test
├── public/
│   └── index.html               # HTML template with CSP
├── webpack.config.js            # Renderer bundling
├── jest.config.ts               # Test configuration
└── package.json
```

## Module Responsibilities

### Main Process (`src/main/`)

- **main.ts** - Creates the BrowserWindow with secure settings (`nodeIntegration: false`, `contextIsolation: true`). Initializes the security service, database, WebSocket simulation server, and IPC handlers. Logs warnings when DevTools are opened in production.

- **preload.ts** - Exposes a whitelisted `electronAPI` to the renderer via `contextBridge.exposeInMainWorld`. Channel validation prevents arbitrary IPC access.

- **ipc.ts** - Registers all IPC handlers wrapped in `safeHandle()`, which catches errors and strips stack traces before they reach the renderer. Handles simulation controls and database CRUD.

- **database/** - SQLite layer using `better-sqlite3`. Singleton `db.ts` enables WAL mode and creates the schema. `ChatRepository` handles chat CRUD. `MessageRepository` encrypts bodies before storage and decrypts on retrieval. `seed.ts` generates 200 chats with 20,000 messages.

- **websocket/** - `SimulationServer` runs a WebSocket server that generates random chat messages every 1-3 seconds. Includes heartbeat ping/pong, connection tracking, and simulation controls (start, stop, trigger, connection drop).

### Renderer (`src/renderer/`)

- **store/** - Redux Toolkit store with three slices: `connectionSlice` (WebSocket status, reconnect tracking), `chatsSlice` (chat list with pagination), `messagesSlice` (per-chat messages keyed by chatId, FTS search).

- **services/websocket.ts** - WebSocket client with exponential backoff reconnection (base 1s, max 30s). Dispatches Redux actions on message events.

- **components/ChatList/** - Virtualized chat list using `react-window` v2 `List`. 72px row height, infinite scroll pagination, skeleton loading.

- **components/MessageView/** - Message display with auto-scroll, load-older pagination, local search filter with text highlighting, sender-colored bubbles, and skeleton loading.

- **components/ErrorBoundary.tsx** - React class component. Sidebar and main content are wrapped independently so a crash in one doesn't affect the other.

- **hooks/useKeyboardShortcuts.ts** - Global keyboard shortcuts: `Ctrl/Cmd+K` (focus search), `Escape` (blur input / clear selection), `Arrow Up/Down` (navigate chat list).

- **utils/** - Shared functions extracted from components: `formatTimestamp` (short/long mode), `senderColor` (deterministic hash), `truncate`, `baseButtonStyle`.

### Shared (`src/shared/`)

- **types.ts** - TypeScript interfaces shared between processes: `Chat`, `Message`, `SimulationEvent`, `SimulationStatus`, `ElectronAPI`.

- **security/** - `ISecurityService` interface with `encrypt`/`decrypt`/`scrub`. `MockSecurityService` passes data through unchanged (development). `sanitizeError` strips stack traces. `redactForLog` removes long strings from log output.

## Data Flow

```
    [SQLite Database]
          |
    [Repositories] <-- encrypt/decrypt via SecurityService
          |
    [IPC Handlers] <-- safeHandle wraps errors
          |
    [preload.ts]   <-- contextBridge (whitelist)
          |
    [Redux Thunks] --> [Redux Store] --> [React Components]
          |
    [WebSocket Server] --> [WebSocket Client] --> [Redux Dispatch]
```

1. **Database to Renderer**: Components dispatch async thunks (e.g., `loadChats`). Thunks call `window.electronAPI.*` methods exposed by preload. These invoke IPC handlers in main, which query repositories. Results flow back through IPC to update Redux.

2. **Real-time updates**: `SimulationServer` generates messages and broadcasts over WebSocket. The renderer's `WebSocketService` receives events and dispatches Redux actions (`messageReceived`, `chatUpdatedByMessage`).

3. **Security boundary**: `MessageRepository.addMessage()` encrypts the body before INSERT. `getMessages()` and `searchMessages()` decrypt after SELECT. IPC errors are sanitized by `safeHandle` before reaching the renderer.

## Database Indexes

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_messages_chat_ts` | messages | `(chatId, ts)` | Fast message retrieval per chat ordered by timestamp. Used by `getMessages()` for paginated loading. |
| `idx_chats_last_message` | chats | `(lastMessageAt)` | Efficient chat list ordering by most recent activity. Used by `getChats()` ORDER BY. |
| `messages_fts` (FTS5) | messages | `body` (full-text) | Full-text search on message bodies. Content-synced via INSERT/DELETE/UPDATE triggers. |

The FTS5 virtual table uses `content='messages'` and `content_rowid='id'` (external content table pattern). Three triggers (`messages_ai`, `messages_ad`, `messages_au`) keep the FTS index synchronized.

## Virtualization Approach

The chat list uses `react-window` v2 for virtualized rendering:

- **Fixed-height rows (72px)** - Enables `List` with `rowHeight={72}` for O(1) scroll position calculation.
- **Row component pattern** - `ChatListItemRow` receives `RowComponentProps<ChatRowProps>` with custom data via `rowProps`.
- **Overscan** - 10 rows rendered outside the viewport (`overscanCount={10}`) to prevent flashing during fast scrolling.
- **Infinite scroll** - `onRowsRendered` checks if the rendered range is within 10 items of the end and loads the next page.
- **Virtual row count** - Includes an extra loading row when more data is being fetched.

The message list uses native scrolling (not virtualized) because:
- Messages have variable heights due to different body lengths
- The typical visible count (50 initially loaded) doesn't need virtualization
- Auto-scroll-to-bottom and load-older patterns are simpler with native scroll

## Security Considerations

### Implemented

- **Context isolation** - `contextIsolation: true`, `nodeIntegration: false`. Renderer has no direct Node.js access.
- **IPC whitelisting** - Preload validates channel names. Only declared channels are accessible.
- **Error sanitization** - `safeHandle()` strips stack traces and file paths from IPC errors.
- **Content Security Policy** - `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`.
- **Security service abstraction** - `ISecurityService` interface. Swapping `MockSecurityService` for AES-256-GCM requires one line change in `main.ts`.
- **Production DevTools warning** - Console warning when DevTools are opened in production.
- **Log redaction** - `redactForLog()` replaces long quoted strings with `[REDACTED]`.

### Not Implemented (mock only)

- **Encryption** - `MockSecurityService` is a pass-through. Production would use AES-256-GCM with per-message IVs.
- **FTS with encryption** - FTS5 index receives plaintext. Real encryption would need a different search strategy.
- **Authentication** - No user auth. The "You" sender is hardcoded.
- **TLS for WebSocket** - Local WS server uses `ws://` not `wss://`.

## Trade-offs

| Decision | Trade-off |
|----------|-----------|
| **Mock encryption** | Allows FTS to work natively. Real encryption would require a custom FTS strategy. |
| **Inline styles** | Fast iteration, no class naming overhead. Mitigated by shared `buttonStyles` and MUI theme. |
| **react-window for chat list only** | Messages use native scroll. Simpler auto-scroll logic at the cost of full DOM rendering. |
| **Single-machine WebSocket** | WS server and client on same machine. Real app would use a remote server. |
| **SQLite** | Perfect for desktop: zero config, fast, embedded. Not for multi-user server deployments. |
| **Seed data at startup** | 200 chats / 20k messages for realistic testing. Adds ~1-2s to first launch. |
| **MUI for skeletons only** | Minimal bundle impact vs. full MUI adoption. |

## What Would Be Improved With More Time

- **Real encryption** - AES-256-GCM via `node:crypto`, key derived from user passphrase via scrypt
- **End-to-end tests** - Playwright tests that launch the full Electron app
- **Message virtualization** - Variable-height virtualized list for chats with thousands of messages
- **User authentication** - Sign-in flow with per-user message attribution
- **Remote WebSocket** - Replace local simulation with a real chat backend
- **Code splitting** - Lazy-load message panel and search to reduce bundle size
- **Accessibility** - ARIA labels, keyboard focus indicators, screen reader announcements
- **Offline support** - Queue messages when disconnected, send on reconnect
- **CI pipeline** - GitHub Actions for lint, typecheck, test, and build

## Screenshots

To capture screenshots of the running application:

1. Start the app: `npm run dev`
2. Wait for both the webpack dev server (port 3000) and Electron window to launch
3. The app opens with a dark-themed two-panel layout:
   - **Left panel**: Chat list with connection status, search, and simulation controls
   - **Right panel**: Message view with bubbles, auto-scroll, and input
4. Use your OS screenshot tool or Electron DevTools (Ctrl+Shift+P > "Capture screenshot")

## Testing

Tests use Jest with ts-jest and cover four areas:

- **Database** (`tests/database/`) - ChatRepository and MessageRepository against in-memory SQLite. Tests CRUD, pagination, FTS search, encryption roundtrip.
- **Redux** (`tests/store/`) - Connection slice reducer: state transitions, reconnect counting, error handling.
- **Security** (`tests/security/`) - MockSecurityService roundtrip, singleton management, error sanitization, log redaction.
- **WebSocket** (`tests/websocket/`) - Integration test with a real WS server: connect, reconnect after drop, heartbeat, broadcast, graceful shutdown.

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```
