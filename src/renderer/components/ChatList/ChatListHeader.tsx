import React, { useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loadChats } from '../../store/chatsSlice';
import { searchMessages, clearSearch } from '../../store/messagesSlice';
import type { ConnectionStatus } from '../../store/connectionSlice';
import { baseButtonStyle } from '../../utils';

const STATUS_DOT: Record<ConnectionStatus, string> = {
  connected: '#4ade80',
  connecting: '#facc15',
  disconnected: '#f87171',
};

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connected: 'Connected',
  connecting: 'Connecting...',
  disconnected: 'Disconnected',
};

interface ChatListHeaderProps {
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

const ChatListHeader: React.FC<ChatListHeaderProps> = ({ searchInputRef }) => {
  const dispatch = useAppDispatch();
  const { status, reconnectAttempts } = useAppSelector((s) => s.connection);
  const [searchQuery, setSearchQuery] = useState('');
  const [reseeding, setReseeding] = useState(false);

  const handleConnectionDrop = useCallback(async () => {
    try {
      await window.electronAPI.simConnectionDrop();
    } catch (err) {
      console.error('[ChatListHeader] Failed to simulate connection drop:', err);
    }
  }, []);

  const handleReseed = useCallback(async () => {
    setReseeding(true);
    try {
      await window.electronAPI.reseedDatabase();
      dispatch(loadChats({ limit: 50, offset: 0 }));
    } catch (err) {
      console.error('[ChatListHeader] Failed to reseed database:', err);
    } finally {
      setReseeding(false);
    }
  }, [dispatch]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = searchQuery.trim();
      if (trimmed.length > 0) {
        dispatch(searchMessages({ query: trimmed, limit: 50 }));
      } else {
        dispatch(clearSearch());
      }
    },
    [dispatch, searchQuery],
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    dispatch(clearSearch());
  }, [dispatch]);

  return (
    <div
      style={{
        padding: '12px',
        borderBottom: '1px solid #2a2a4a',
      }}
    >
      {/* Top row: title + status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', color: '#eaeaea' }}>Chats</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: STATUS_DOT[status],
              display: 'inline-block',
              boxShadow: status === 'connected' ? `0 0 6px ${STATUS_DOT[status]}` : 'none',
            }}
          />
          <span style={{ fontSize: '11px', color: '#888' }}>
            {STATUS_LABEL[status]}
            {reconnectAttempts > 0 && status !== 'connected' && ` (#${reconnectAttempts})`}
          </span>
        </div>
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        <button
          style={baseButtonStyle}
          onClick={handleConnectionDrop}
          title="Simulate connection drop"
        >
          Drop Connection
        </button>
        <button
          style={{
            ...baseButtonStyle,
            opacity: reseeding ? 0.5 : 1,
          }}
          onClick={handleReseed}
          disabled={reseeding}
          title="Regenerate all seed data"
        >
          {reseeding ? 'Reseeding...' : 'Reseed Data'}
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '6px' }}>
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search messages... (Ctrl+K)"
          style={{
            flex: 1,
            padding: '6px 10px',
            fontSize: '13px',
            backgroundColor: '#16213e',
            color: '#eaeaea',
            border: '1px solid #2a2a4a',
            borderRadius: '6px',
            outline: 'none',
          }}
        />
        {searchQuery && (
          <button type="button" onClick={handleClearSearch} style={baseButtonStyle}>
            Clear
          </button>
        )}
      </form>
    </div>
  );
};

export default ChatListHeader;
