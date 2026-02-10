import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loadMessages } from '../../store/messagesSlice';
import MessageItem from './MessageItem';
import MessageSkeleton from './MessageSkeleton';
import type { Message } from '../../../shared/types';
import { baseButtonStyle } from '../../utils';

const PAGE_SIZE = 50;
const OWN_SENDER = 'You';

interface MessageListProps {
  chatId: number;
  searchFilter: string;
}

const MessageList: React.FC<MessageListProps> = ({ chatId, searchFilter }) => {
  const dispatch = useAppDispatch();
  const chatMessages = useAppSelector((s) => s.messages.byChatId[chatId]);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const prevItemCountRef = useRef(0);

  // Load initial messages when chat changes
  useEffect(() => {
    dispatch(loadMessages({ chatId, limit: PAGE_SIZE, offset: 0 }));
    setIsAtBottom(true);
    prevItemCountRef.current = 0;
  }, [chatId, dispatch]);

  // Auto-scroll to bottom when new messages arrive and user is at bottom
  useEffect(() => {
    const items = chatMessages?.items ?? [];
    if (items.length > prevItemCountRef.current && isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevItemCountRef.current = items.length;
  }, [chatMessages?.items, isAtBottom]);

  // Track if user is at bottom
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 60;
    setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < threshold);
  }, []);

  const handleLoadOlder = useCallback(() => {
    if (!chatMessages || chatMessages.loading || !chatMessages.hasMore) return;
    dispatch(loadMessages({ chatId, limit: PAGE_SIZE, offset: chatMessages.items.length }));
  }, [dispatch, chatId, chatMessages]);

  // Memoize the reversed + filtered message list to avoid recomputation on every render
  const displayed = useMemo(() => {
    if (!chatMessages) return [];
    const reversed = [...chatMessages.items].reverse();
    if (searchFilter.length === 0) return reversed;
    const lower = searchFilter.toLowerCase();
    return reversed.filter(
      (m) => m.body.toLowerCase().includes(lower) || m.sender.toLowerCase().includes(lower),
    );
  }, [chatMessages, searchFilter]);

  if (!chatMessages) {
    return <MessageSkeleton />;
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Load older button */}
      {chatMessages.hasMore && searchFilter.length === 0 && (
        <div style={{ textAlign: 'center', padding: '12px' }}>
          <button
            onClick={handleLoadOlder}
            disabled={chatMessages.loading}
            style={{
              ...baseButtonStyle,
              padding: '5px 14px',
              cursor: chatMessages.loading ? 'default' : 'pointer',
              opacity: chatMessages.loading ? 0.5 : 1,
            }}
          >
            {chatMessages.loading ? 'Loading...' : 'Load older messages'}
          </button>
        </div>
      )}

      {chatMessages.loading && chatMessages.items.length === 0 && <MessageSkeleton />}

      {!chatMessages.loading && displayed.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#555' }}>
            {searchFilter.length > 0 ? 'No messages match your search' : 'No messages yet'}
          </span>
        </div>
      )}

      {/* Message items */}
      <div style={{ padding: '8px 0' }}>
        {displayed.map((msg, i) => {
          const prev = i > 0 ? displayed[i - 1] : undefined;
          const showSender = !prev || prev.sender !== msg.sender;

          return (
            <MessageItem
              key={msg.id}
              message={msg}
              isOwnUser={msg.sender === OWN_SENDER}
              showSender={showSender}
              highlight={searchFilter.length > 0 ? searchFilter : undefined}
            />
          );
        })}
      </div>

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
