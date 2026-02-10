import React, { type ReactElement } from 'react';
import type { Chat } from '../../../shared/types';
import type { RowComponentProps } from 'react-window';
import { formatTimestamp } from '../../utils';

export interface ChatRowProps {
  chats: Chat[];
  selectedChatId: number | null;
  onSelect: (chatId: number) => void;
}

export default function ChatListItemRow(
  props: RowComponentProps<ChatRowProps>,
): ReactElement | null {
  const { index, style, chats, selectedChatId, onSelect } = props;

  // Loading row at the end
  if (index >= chats.length) {
    return (
      <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#666', fontSize: '13px' }}>Loading more...</span>
      </div>
    );
  }

  const chat = chats[index]!;
  const isSelected = chat.id === selectedChatId;

  return (
    <div
      style={{
        ...style,
        boxSizing: 'border-box' as const,
        padding: '0 12px',
      }}
      onClick={() => onSelect(chat.id)}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          padding: '0 12px',
          borderRadius: '8px',
          cursor: 'pointer',
          backgroundColor: isSelected ? '#0f3460' : 'transparent',
          transition: 'background-color 0.15s',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) e.currentTarget.style.backgroundColor = '#16213e';
        }}
        onMouseLeave={(e) => {
          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: isSelected ? '#1a5276' : '#2a2a4a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 600,
            color: '#8888aa',
            flexShrink: 0,
          }}
        >
          {chat.title.charAt(0).toUpperCase()}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, marginLeft: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span
              style={{
                fontSize: '14px',
                fontWeight: chat.unreadCount > 0 ? 700 : 400,
                color: '#eaeaea',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {chat.title}
            </span>
            <span
              style={{
                fontSize: '11px',
                color: chat.unreadCount > 0 ? '#4ade80' : '#666',
                flexShrink: 0,
                marginLeft: '8px',
              }}
            >
              {formatTimestamp(chat.lastMessageAt)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
            <span
              style={{
                fontSize: '12px',
                color: '#777',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              Tap to view messages
            </span>

            {chat.unreadCount > 0 && (
              <span
                style={{
                  backgroundColor: '#4ade80',
                  color: '#111',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  padding: '1px 7px',
                  minWidth: '18px',
                  textAlign: 'center',
                  flexShrink: 0,
                  marginLeft: '8px',
                }}
              >
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
