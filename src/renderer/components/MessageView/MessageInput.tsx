import React, { useState, useCallback, useRef } from 'react';

interface MessageInputProps {
  chatId: number;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ chatId, disabled }) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (trimmed.length === 0 || sending) return;

    setSending(true);
    try {
      await window.electronAPI.simTriggerMessage(chatId);
      setText('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('[MessageInput] Failed to send message:', err);
    } finally {
      setSending(false);
    }
  }, [text, chatId, sending]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        padding: '12px 16px',
        borderTop: '1px solid #2a2a4a',
        backgroundColor: '#141425',
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message... (triggers simulation)"
        disabled={disabled || sending}
        style={{
          flex: 1,
          padding: '10px 14px',
          fontSize: '13px',
          backgroundColor: '#1e1e3a',
          color: '#eaeaea',
          border: '1px solid #2a2a4a',
          borderRadius: '8px',
          outline: 'none',
        }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || sending || text.trim().length === 0}
        style={{
          padding: '10px 20px',
          fontSize: '13px',
          fontWeight: 600,
          backgroundColor: '#0f3460',
          color: '#eaeaea',
          border: 'none',
          borderRadius: '8px',
          cursor: disabled || sending || text.trim().length === 0 ? 'default' : 'pointer',
          opacity: disabled || sending || text.trim().length === 0 ? 0.4 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        Send
      </button>
    </div>
  );
};

export default MessageInput;
