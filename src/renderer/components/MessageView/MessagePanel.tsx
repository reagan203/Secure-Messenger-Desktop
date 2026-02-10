import React, { useState, useCallback, useMemo } from 'react';
import { useAppSelector } from '../../store/hooks';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

const MessagePanel: React.FC = () => {
  const selectedChatId = useAppSelector((s) => s.chats.selectedChatId);
  const chats = useAppSelector((s) => s.chats.chats);
  // Memoize chat lookup to avoid re-scanning the array on unrelated state changes
  const chat = useMemo(
    () => (selectedChatId !== null ? chats.find((c) => c.id === selectedChatId) : undefined),
    [chats, selectedChatId],
  );
  const [searchFilter, setSearchFilter] = useState('');

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchFilter(e.target.value);
  }, []);

  if (selectedChatId === null || !chat) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#555' }}>
          <p style={{ fontSize: '15px' }}>Select a chat to view messages</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid #2a2a4a',
          backgroundColor: '#141425',
          flexShrink: 0,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '15px', color: '#eaeaea' }}>{chat.title}</h2>
          <span style={{ fontSize: '11px', color: '#666' }}>Chat #{chat.id}</span>
        </div>
        <input
          type="text"
          value={searchFilter}
          onChange={handleSearchChange}
          placeholder="Filter messages..."
          style={{
            width: '200px',
            padding: '6px 10px',
            fontSize: '12px',
            backgroundColor: '#1e1e3a',
            color: '#eaeaea',
            border: '1px solid #2a2a4a',
            borderRadius: '6px',
            outline: 'none',
          }}
        />
      </div>

      {/* Message list */}
      <MessageList chatId={selectedChatId} searchFilter={searchFilter} />

      {/* Input */}
      <MessageInput chatId={selectedChatId} />
    </div>
  );
};

export default MessagePanel;
