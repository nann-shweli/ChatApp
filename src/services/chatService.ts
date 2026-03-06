import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import {v4 as uuidv4} from '../utils/uuid';
import {Message, MessageType, UserConversationItem, User} from '../types';

const PAGE_SIZE = 30;

// ─── Conversation helpers ─────────────────────────────────────────────────────

/**
 * Find or create a direct (1:1) conversation between currentUid and otherUid.
 * Returns the conversation cid.
 */
export const getOrCreateDirectConversation = async (
  currentUid: string,
  otherUid: string,
): Promise<string> => {
  // Check if a direct conversation already exists (query userConversations)
  // We store a deterministic cid for direct chats so we don't need a complex query
  const directCid = [currentUid, otherUid].sort().join('_');

  const convRef = firestore().collection('conversations').doc(directCid);
  const convSnap = await convRef.get();

  if (!convSnap.exists) {
    const batch = firestore().batch();

    // Create conversation doc
    batch.set(convRef, {
      type: 'direct',
      lastMessage: '',
      lastMessageAt: firestore.FieldValue.serverTimestamp(),
      lastSenderId: '',
      createdAt: firestore.FieldValue.serverTimestamp(),
      createdBy: currentUid,
    });

    // Add both members
    const membersRef = convRef.collection('members');
    const now = firestore.Timestamp.now();

    batch.set(membersRef.doc(currentUid), {
      uid: currentUid,
      role: 'member',
      lastReadAt: now,
      muted: false,
      joinedAt: firestore.FieldValue.serverTimestamp(),
    });

    batch.set(membersRef.doc(otherUid), {
      uid: otherUid,
      role: 'member',
      lastReadAt: firestore.Timestamp.fromMillis(0),
      muted: false,
      joinedAt: firestore.FieldValue.serverTimestamp(),
    });

    // Bootstrap userConversations for both users
    const emptyItem = {
      cid: directCid,
      lastMessagePreview: '',
      lastMessageAt: firestore.FieldValue.serverTimestamp(),
      unreadCount: 0,
      muted: false,
      archived: false,
    };

    batch.set(
      firestore()
        .collection('userConversations')
        .doc(currentUid)
        .collection('items')
        .doc(directCid),
      emptyItem,
    );

    batch.set(
      firestore()
        .collection('userConversations')
        .doc(otherUid)
        .collection('items')
        .doc(directCid),
      emptyItem,
    );

    await batch.commit();
  }

  return directCid;
};

export const createGroupConversation = async (
  currentUid: string,
  memberUids: string[],
  groupName: string,
): Promise<string> => {
  const convRef = firestore().collection('conversations').doc();
  const cid = convRef.id;
  const allMembers = [currentUid, ...memberUids];
  const batch = firestore().batch();

  batch.set(convRef, {
    type: 'group',
    name: groupName,
    photoURL: '',
    lastMessage: '',
    lastMessageAt: firestore.FieldValue.serverTimestamp(),
    lastSenderId: '',
    createdAt: firestore.FieldValue.serverTimestamp(),
    createdBy: currentUid,
  });

  for (const uid of allMembers) {
    batch.set(convRef.collection('members').doc(uid), {
      uid,
      role: uid === currentUid ? 'admin' : 'member',
      lastReadAt: firestore.Timestamp.fromMillis(0),
      muted: false,
      joinedAt: firestore.FieldValue.serverTimestamp(),
    });

    batch.set(
      firestore()
        .collection('userConversations')
        .doc(uid)
        .collection('items')
        .doc(cid),
      {
        cid,
        lastMessagePreview: '',
        lastMessageAt: firestore.FieldValue.serverTimestamp(),
        unreadCount: 0,
        muted: false,
        archived: false,
      },
    );
  }

  await batch.commit();
  return cid;
};

// ─── Send message ─────────────────────────────────────────────────────────────

export const sendMessage = async (params: {
  cid: string;
  senderId: string;
  type: MessageType;
  text?: string;
  mediaUrl?: string;
  mediaDuration?: number;
  clientId?: string;
}): Promise<string> => {
  const {cid, senderId, type, text, mediaUrl, mediaDuration} = params;
  const clientId = params.clientId ?? uuidv4();
  const messagesRef = firestore()
    .collection('conversations')
    .doc(cid)
    .collection('messages');

  // De-dup: don't re-send if clientId already exists
  const existing = await messagesRef
    .where('clientId', '==', clientId)
    .limit(1)
    .get();

  if (!existing.empty) {
    return existing.docs[0].id;
  }

  const msgRef = messagesRef.doc();
  await msgRef.set({
    mid: msgRef.id,
    clientId,
    senderId,
    type,
    ...(text !== undefined && {text}),
    ...(mediaUrl !== undefined && {mediaUrl}),
    ...(mediaDuration !== undefined && {mediaDuration}),
    createdAt: firestore.FieldValue.serverTimestamp(),
  });

  return msgRef.id;
};

// ─── Chat list listener ───────────────────────────────────────────────────────

export const listenChatList = (
  uid: string,
  onData: (items: UserConversationItem[]) => void,
  onError?: (err: Error) => void,
) => {
  return firestore()
    .collection('userConversations')
    .doc(uid)
    .collection('items')
    .orderBy('lastMessageAt', 'desc')
    .limit(PAGE_SIZE)
    .onSnapshot(
      snap => {
        const items = snap.docs.map(d => ({
          ...(d.data() as UserConversationItem),
          cid: d.id,
        }));
        onData(items);
      },
      err => onError?.(err),
    );
};

// ─── Messages listener ────────────────────────────────────────────────────────

export const listenMessages = (
  cid: string,
  onData: (messages: Message[]) => void,
  onError?: (err: Error) => void,
) => {
  return firestore()
    .collection('conversations')
    .doc(cid)
    .collection('messages')
    .orderBy('createdAt', 'desc')
    .limit(PAGE_SIZE)
    .onSnapshot(
      snap => {
        const messages = snap.docs.map(d => d.data() as Message);
        onData(messages);
      },
      err => onError?.(err),
    );
};

// ─── Pagination: fetch older messages ────────────────────────────────────────

export const fetchOlderMessages = async (
  cid: string,
  lastMessage: Message,
): Promise<Message[]> => {
  const snap = await firestore()
    .collection('conversations')
    .doc(cid)
    .collection('messages')
    .orderBy('createdAt', 'desc')
    .startAfter(lastMessage.createdAt)
    .limit(PAGE_SIZE)
    .get();

  return snap.docs.map(d => d.data() as Message);
};

// ─── Read receipt ─────────────────────────────────────────────────────────────

export const markAsRead = async (cid: string, uid: string) => {
  await Promise.all([
    firestore()
      .collection('conversations')
      .doc(cid)
      .collection('members')
      .doc(uid)
      .update({lastReadAt: firestore.FieldValue.serverTimestamp()}),
    firestore()
      .collection('userConversations')
      .doc(uid)
      .collection('items')
      .doc(cid)
      .update({unreadCount: 0}),
  ]);
};

// ─── Member lastReadAt listener (for read receipts) ───────────────────────────

export const listenMemberReadAt = (
  cid: string,
  uid: string,
  onData: (ts: FirebaseFirestoreTypes.Timestamp | null) => void,
) => {
  return firestore()
    .collection('conversations')
    .doc(cid)
    .collection('members')
    .doc(uid)
    .onSnapshot(snap => {
      onData(snap.data()?.lastReadAt ?? null);
    });
};

// ─── Conversation metadata ────────────────────────────────────────────────────

export const getConversation = async (cid: string) => {
  const snap = await firestore().collection('conversations').doc(cid).get();
  return Boolean(snap.exists) ? snap.data() : null;
};

export const getConversationMembers = async (cid: string) => {
  const snap = await firestore()
    .collection('conversations')
    .doc(cid)
    .collection('members')
    .get();
  return snap.docs.map(d => d.data());
};

// ─── User search ─────────────────────────────────────────────────────────────

export const searchUsers = async (
  query: string,
  currentUid: string,
): Promise<User[]> => {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const usersRef = firestore().collection('users');
  let snap;

  if (trimmed.includes('@')) {
    // Search by email - try both original and lowercase for compatibility
    const variations = Array.from(new Set([trimmed, trimmed.toLowerCase()]));
    snap = await usersRef.where('email', 'in', variations).get();
  } else {
    // Search by name (prefix match)
    snap = await usersRef
      .where('displayName', '>=', trimmed)
      .where('displayName', '<=', trimmed + '\uf8ff')
      .limit(20)
      .get();
  }

  return snap.docs
    .map(d => d.data() as User)
    .filter(u => u.uid !== currentUid);
};

export const getAllUsers = async (currentUid: string): Promise<User[]> => {
  const snap = await firestore()
    .collection('users')
    .orderBy('displayName')
    .limit(50)
    .get();
  return snap.docs
    .map(d => d.data() as User)
    .filter(u => u.uid !== currentUid);
};

export const getUserById = async (uid: string): Promise<User | null> => {
  const snap = await firestore().collection('users').doc(uid).get();
  return Boolean(snap.exists) ? (snap.data() as User) : null;
};
