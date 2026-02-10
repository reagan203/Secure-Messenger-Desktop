import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppDispatch } from './store/hooks';
import { loadChats } from './store/chatsSlice';
import { WebSocketService } from './services/websocket';
import { ChatList, ChatListHeader } from './components/ChatList';
import { MessagePanel } from './components/MessageView';
import ErrorBoundary from './components/ErrorBoundary';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import './App.css';

const WS_URL = 'ws://localhost:8080';

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const wsRef = useRef<WebSocketService | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useKeyboardShortcuts({ searchInputRef });

  useEffect(() => {
    dispatch(loadChats({ limit: 50, offset: 0 }));

    const ws = new WebSocketService(dispatch, WS_URL);
    ws.connect();
    wsRef.current = ws;

    return () => {
      ws.disconnect();
    };
  }, [dispatch]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const handleChatSelected = useCallback(() => {
    if (window.innerWidth <= 768) {
      setSidebarCollapsed(true);
    }
  }, []);

  return (
    <div className="app">
      {/* Mobile overlay when sidebar is open */}
      {!sidebarCollapsed && (
        <div className="sidebar-overlay" onClick={toggleSidebar} />
      )}

      <ErrorBoundary section="sidebar">
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <ChatListHeader searchInputRef={searchInputRef} />
          <ChatList onChatSelected={handleChatSelected} />
        </aside>
      </ErrorBoundary>

      <ErrorBoundary section="messages">
        <main className="main-content">
          <button
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
          >
            {sidebarCollapsed ? '\u2630' : '\u2715'}
          </button>
          <MessagePanel />
        </main>
      </ErrorBoundary>
    </div>
  );
};

export default App;
