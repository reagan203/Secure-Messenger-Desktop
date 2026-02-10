import React, { memo } from 'react';
import type { Message } from '../../../shared/types';
import { formatTimestamp, senderColor } from '../../utils';

interface MessageItemProps {
  message: Message;
  isOwnUser: boolean;
  showSender: boolean;
  highlight?: string;
}

function highlightText(text: string, query: string | undefined): React.ReactNode {
  if (!query || query.length === 0) return text;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} style={{ backgroundColor: '#facc15', color: '#111', borderRadius: '2px', padding: '0 1px' }}>
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

const MessageItem: React.FC<MessageItemProps> = ({ message, isOwnUser, showSender, highlight }) => {
  const color = senderColor(message.sender);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOwnUser ? 'flex-end' : 'flex-start',
        padding: '2px 16px',
      }}
    >
      {showSender && (
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color,
            marginBottom: '2px',
            marginLeft: isOwnUser ? 0 : '12px',
            marginRight: isOwnUser ? '12px' : 0,
          }}
        >
          {message.sender}
        </span>
      )}
      <div
        style={{
          maxWidth: '70%',
          padding: '8px 12px',
          borderRadius: isOwnUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
          backgroundColor: isOwnUser ? '#0f3460' : '#1e1e3a',
          border: `1px solid ${isOwnUser ? '#1a4a7a' : '#2a2a4a'}`,
        }}
      >
        <p style={{ fontSize: '13px', lineHeight: '1.45', margin: 0, wordBreak: 'break-word' }}>
          {highlightText(message.body, highlight)}
        </p>
        <span
          style={{
            display: 'block',
            fontSize: '10px',
            color: '#666',
            marginTop: '4px',
            textAlign: isOwnUser ? 'right' : 'left',
          }}
        >
          {formatTimestamp(message.ts, 'long')}
        </span>
      </div>
    </div>
  );
};

export default memo(MessageItem);
