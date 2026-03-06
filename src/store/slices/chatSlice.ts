import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {UserConversationItem, Message} from '../../types';

interface ChatState {
  conversations: UserConversationItem[];
  messages: Record<string, Message[]>; // keyed by cid
  activeTypers: Record<string, string[]>; // cid → [uid, ...]
}

const initialState: ChatState = {
  conversations: [],
  messages: {},
  activeTypers: {},
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setConversations(
      state,
      action: PayloadAction<UserConversationItem[]>,
    ) {
      state.conversations = action.payload;
    },
    setMessages(
      state,
      action: PayloadAction<{cid: string; messages: Message[]}>,
    ) {
      state.messages[action.payload.cid] = action.payload.messages;
    },
    prependMessages(
      state,
      action: PayloadAction<{cid: string; messages: Message[]}>,
    ) {
      const existing = state.messages[action.payload.cid] ?? [];
      state.messages[action.payload.cid] = [
        ...action.payload.messages,
        ...existing,
      ];
    },
    setActiveTypers(
      state,
      action: PayloadAction<{cid: string; uids: string[]}>,
    ) {
      state.activeTypers[action.payload.cid] = action.payload.uids;
    },
    clearMessages(state, action: PayloadAction<string>) {
      delete state.messages[action.payload];
    },
  },
});

export const {
  setConversations,
  setMessages,
  prependMessages,
  setActiveTypers,
  clearMessages,
} = chatSlice.actions;
export default chatSlice.reducer;
