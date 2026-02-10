import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { Message } from '../../shared/types';

interface MessagesForChat {
  items: Message[];
  loading: boolean;
  hasMore: boolean;
}

interface SearchResult extends Message {
  chatTitle: string;
}

interface MessagesState {
  byChatId: Record<number, MessagesForChat>;
  searchResults: SearchResult[];
  searchLoading: boolean;
  error: string | null;
}

const initialState: MessagesState = {
  byChatId: {},
  searchResults: [],
  searchLoading: false,
  error: null,
};

export const loadMessages = createAsyncThunk(
  'messages/loadMessages',
  async ({ chatId, limit, offset }: { chatId: number; limit?: number; offset?: number }) => {
    const messages: Message[] = await window.electronAPI.getMessages(chatId, limit, offset);
    return { chatId, messages, limit: limit ?? 50 };
  }
);

export const searchMessages = createAsyncThunk(
  'messages/searchMessages',
  async ({ query, limit }: { query: string; limit?: number }) => {
    const results = await window.electronAPI.searchMessages(query, limit);
    return results as SearchResult[];
  }
);

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    messageReceived(state, action: PayloadAction<Message>) {
      const msg = action.payload;
      const chatMessages = state.byChatId[msg.chatId];
      if (chatMessages) {
        // Insert at front (messages are ordered newest first)
        chatMessages.items.unshift(msg);
      }
    },
    clearSearch(state) {
      state.searchResults = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // loadMessages
      .addCase(loadMessages.pending, (state, action) => {
        const { chatId } = action.meta.arg;
        if (!state.byChatId[chatId]) {
          state.byChatId[chatId] = { items: [], loading: true, hasMore: true };
        } else {
          state.byChatId[chatId]!.loading = true;
        }
        state.error = null;
      })
      .addCase(loadMessages.fulfilled, (state, action) => {
        const { chatId, messages, limit } = action.payload;
        const chat = state.byChatId[chatId]!;
        const offset = action.meta.arg.offset ?? 0;

        if (offset === 0) {
          chat.items = messages;
        } else {
          // Append older messages, deduplicate
          const existingIds = new Set(chat.items.map((m) => m.id));
          const newMsgs = messages.filter((m) => !existingIds.has(m.id));
          chat.items.push(...newMsgs);
        }
        chat.hasMore = messages.length >= limit;
        chat.loading = false;
      })
      .addCase(loadMessages.rejected, (state, action) => {
        const { chatId } = action.meta.arg;
        const chat = state.byChatId[chatId];
        if (chat) chat.loading = false;
        state.error = action.error.message ?? 'Failed to load messages';
      })
      // searchMessages
      .addCase(searchMessages.pending, (state) => {
        state.searchLoading = true;
        state.error = null;
      })
      .addCase(searchMessages.fulfilled, (state, action) => {
        state.searchResults = action.payload;
        state.searchLoading = false;
      })
      .addCase(searchMessages.rejected, (state, action) => {
        state.searchLoading = false;
        state.error = action.error.message ?? 'Search failed';
      });
  },
});

export const { messageReceived, clearSearch } = messagesSlice.actions;
export default messagesSlice.reducer;
