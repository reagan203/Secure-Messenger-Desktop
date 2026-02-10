import React, { useCallback, useMemo, useRef } from 'react';
import { List } from 'react-window';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectChat, markChatAsRead, loadChats } from '../../store/chatsSlice';
import ChatListItemRow, { type ChatRowProps } from './ChatListItem';
import ChatListSkeleton from './ChatListSkeleton';

const ITEM_HEIGHT = 72;
const PAGE_SIZE = 50;

interface ChatListProps {
  onChatSelected?: () => void;
}

const ChatList: React.FC<ChatListProps> = ({ onChatSelected }) => {
  const dispatch = useAppDispatch();
  const { chats, selectedChatId, loading, hasMore, error } = useAppSelector((s) => s.chats);
  const loadingRef = useRef(false);

  const handleSelect = useCallback(
    (chatId: number) => {
      dispatch(selectChat(chatId));
      dispatch(markChatAsRead(chatId));
      onChatSelected?.();
    },
    [dispatch, onChatSelected],
  );

  // Infinite scroll: when the last rendered row is within 10 items of the end,
  // fetch the next page. Uses a ref to prevent duplicate concurrent fetches.
  const handleRowsRendered = useCallback(
    (_visible: { startIndex: number; stopIndex: number }, all: { startIndex: number; stopIndex: number }) => {
      if (loadingRef.current || !hasMore) return;

      if (all.stopIndex >= chats.length - 10) {
        loadingRef.current = true;
        dispatch(loadChats({ limit: PAGE_SIZE, offset: chats.length })).finally(() => {
          loadingRef.current = false;
        });
      }
    },
    [dispatch, chats.length, hasMore],
  );

  const rowProps: ChatRowProps = useMemo(
    () => ({
      chats,
      selectedChatId,
      onSelect: handleSelect,
    }),
    [chats, selectedChatId, handleSelect],
  );

  if (loading && chats.length === 0 && !error) {
    return <ChatListSkeleton />;
  }

  if (error) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#f87171' }}>
        <p>Failed to load chats</p>
        <p style={{ fontSize: '12px', color: '#888' }}>{error}</p>
        <button
          onClick={() => dispatch(loadChats({ limit: PAGE_SIZE, offset: 0 }))}
          style={{
            marginTop: '12px',
            padding: '6px 16px',
            backgroundColor: '#0f3460',
            color: '#eaeaea',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (chats.length === 0 && !loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
        No chats yet
      </div>
    );
  }

  const rowCount = chats.length + (loading ? 1 : 0);

  return (
    <div style={{ flex: 1 }}>
      <List
        rowComponent={ChatListItemRow}
        rowCount={rowCount}
        rowHeight={ITEM_HEIGHT}
        rowProps={rowProps}
        overscanCount={10}
        onRowsRendered={handleRowsRendered}
        style={{ height: '100%' }}
      />
    </div>
  );
};

export default ChatList;
