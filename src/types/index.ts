import {FirebaseFirestoreTypes} from '@react-native-firebase/firestore';

export type Timestamp = FirebaseFirestoreTypes.Timestamp;

// ─── User ────────────────────────────────────────────────────────────────────
export interface User {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  fcmToken?: string;
  createdAt: Timestamp;
}

// ─── Conversation ────────────────────────────────────────────────────────────
export type ConversationType = 'direct' | 'group';

export interface Conversation {
  cid: string;
  type: ConversationType;
  name?: string; // group only
  photoURL?: string; // group only
  lastMessage: string;
  lastMessageAt: Timestamp;
  lastSenderId: string;
  createdAt: Timestamp;
  createdBy: string;
}

// ─── Member ───────────────────────────────────────────────────────────────────
export type MemberRole = 'admin' | 'member';

export interface Member {
  uid: string;
  role: MemberRole;
  lastReadAt: Timestamp;
  muted: boolean;
  joinedAt: Timestamp;
}

// ─── Message ──────────────────────────────────────────────────────────────────
export type MessageType = 'text' | 'image' | 'voice';

export interface Message {
  mid: string;
  clientId: string; // de-dup key generated on client
  senderId: string;
  type: MessageType;
  text?: string;
  mediaUrl?: string;
  mediaDuration?: number; // voice, seconds
  createdAt: Timestamp;
  deletedAt?: Timestamp;
}

// ─── UserConversation (fast chat list) ───────────────────────────────────────
export interface UserConversationItem {
  cid: string;
  lastMessagePreview: string;
  lastMessageAt: Timestamp;
  unreadCount: number;
  muted: boolean;
  archived: boolean;
  // Joined at query time, not stored in Firestore
  conversation?: Conversation;
  otherUser?: User; // direct chats only
}

// ─── RTDB Presence ───────────────────────────────────────────────────────────
export interface PresenceStatus {
  online: boolean;
  lastSeen: number; // ms timestamp
}

// ─── RTDB Typing ─────────────────────────────────────────────────────────────
export interface TypingPayload {
  typing: boolean;
  expiresAt: number; // ms timestamp (TTL 5 s)
}

// ─── Navigation ──────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ChatList: undefined;
  Chat: {cid: string; title: string; otherUid?: string};
  NewChat: undefined;
  Profile: undefined;
  CreateGroup: undefined;
};
