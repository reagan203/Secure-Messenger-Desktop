import { configureStore } from '@reduxjs/toolkit';
import connectionReducer from './connectionSlice';
import chatsReducer from './chatsSlice';
import messagesReducer from './messagesSlice';

export const store = configureStore({
  reducer: {
    connection: connectionReducer,
    chats: chatsReducer,
    messages: messagesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
