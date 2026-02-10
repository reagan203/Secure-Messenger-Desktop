import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { Chat, Message } from '../../shared/types';

interface ChatsState {
  chats: Chat[];
  selectedChatId: number | null;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
}

const initialState: ChatsState = {
  chats: [],
  selectedChatId: null,
  loading: false,
  error: null,
  hasMore: true,
};

export const loadChats = createAsyncThunk(
  'chats/loadChats',
  async ({ limit, offset }: { limit?: number; offset?: number }) => {
    const chats: Chat[] = await window.electronAPI.getChats(limit, offset);
    return { chats, limit: limit ?? 50 };
  }
);

export const markChatAsRead = createAsyncThunk(
  'chats/markAsRead',
  async (chatId: number) => {
    await window.electronAPI.markChatAsRead(chatId);
    return chatId;
  }
);

const chatsSlice = createSlice({
  name: 'chats',
  initialState,
  reducers: {
    selectChat(state, action: PayloadAction<number | null>) {
      state.selectedChatId = action.payload;
    },
    chatUpdatedByMessage(state, action: PayloadAction<{ chatId: number; message: Message; chatTitle: string }>) {
      const { chatId, message, chatTitle } = action.payload;
      const existing = state.chats.find((c) => c.id === chatId);
      if (existing) {
        existing.lastMessageAt = message.ts;
        // Only increment unread if this chat is not currently selected
        if (state.selectedChatId !== chatId) {
          existing.unreadCount += 1;
        }
        // Re-sort: move updated chat to top
        state.chats.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
      } else {
        // Chat not loaded yet — prepend it
        state.chats.unshift({
          id: chatId,
          title: chatTitle,
          lastMessageAt: message.ts,
          unreadCount: state.selectedChatId !== chatId ? 1 : 0,
        });
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadChats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadChats.fulfilled, (state, action) => {
        const { chats, limit } = action.payload;
        if (action.meta.arg.offset === 0 || action.meta.arg.offset === undefined) {
          state.chats = chats;
        } else {
          // Append for pagination, deduplicate by id
          const existingIds = new Set(state.chats.map((c) => c.id));
          const newChats = chats.filter((c) => !existingIds.has(c.id));
          state.chats.push(...newChats);
        }
        state.hasMore = chats.length >= limit;
        state.loading = false;
      })
      .addCase(loadChats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load chats';
      })
      .addCase(markChatAsRead.fulfilled, (state, action) => {
        const chat = state.chats.find((c) => c.id === action.payload);
        if (chat) chat.unreadCount = 0;
      });
  },
});

export const { selectChat, chatUpdatedByMessage } = chatsSlice.actions;
export default chatsSlice.reducer;
