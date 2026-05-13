import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import {v4 as uuidv4} from '../utils/uuid';
import {Message, MessageType, UserConversationItem, User} from '../types';
import {normalizeSearchValue} from '../utils/userDisplay';

const PAGE_SIZE = 30;

const documentExists = (
  snap: FirebaseFirestoreTypes.DocumentSnapshot<FirebaseFirestoreTypes.DocumentData>,
) => (typeof snap.exists === 'function' ? snap.exists() : Boolean(snap.exists));

// ─── Conversation helpers ─────────────────────────────────────────────────────

/**
 * Find or create a direct (1:1) conversation between currentUid and otherUid.
 * Returns the conversation cid.
 */
export const getOrCreateDirectConversation = async (
  currentUid: string,
  otherUid: string,
): Promise<string> => {
  const directCid = [currentUid, otherUid].sort().join('_');

  const convRef = firestore().collection('conversations').doc(directCid);
  let convExists = false;

  try {
    const convSnap = await convRef.get();
    convExists = documentExists(convSnap);
  } catch (err) {
    // A brand-new direct chat has no member docs yet, so rules may deny this
    // preflight read. The deterministic ID still lets us safely try creation.
    convExists = false;
  }

  if (!convExists) {
    const batch = firestore().batch();
    const memberIds = [currentUid, otherUid].sort();

    // Create conversation doc
    batch.set(convRef, {
      type: 'direct',
      memberIds,
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

    // Bootstrap the current user's list immediately. Cloud Functions fan this
    // out to all members after creation/messages using Admin privileges.
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

    try {
      await batch.commit();
    } catch (err: any) {
      if (err?.code !== 'firestore/permission-denied') {
        throw err;
      }
    }
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
    memberIds: allMembers,
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
  }

  batch.set(
    firestore()
      .collection('userConversations')
      .doc(currentUid)
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
  const itemRef = firestore()
    .collection('userConversations')
    .doc(uid)
    .collection('items')
    .doc(cid);
  const itemSnap = await itemRef.get();

  await Promise.all([
    firestore()
      .collection('conversations')
      .doc(cid)
      .collection('members')
      .doc(uid)
      .update({lastReadAt: firestore.FieldValue.serverTimestamp()}),
    documentExists(itemSnap)
      ? itemRef.update({unreadCount: 0})
      : Promise.resolve(),
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
  return documentExists(snap) ? snap.data() : null;
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

const mapUserDoc = (
  doc: FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>,
) =>
  ({
    uid: doc.data().uid ?? doc.id,
    displayName: doc.data().displayName ?? '',
    displayNameLowercase: doc.data().displayNameLowercase ?? '',
    email: doc.data().email ?? '',
    emailLowercase: doc.data().emailLowercase ?? '',
    photoURL: doc.data().photoURL ?? '',
    phoneNumber: doc.data().phoneNumber ?? '',
    fcmToken: doc.data().fcmToken,
    createdAt: doc.data().createdAt,
    updatedAt: doc.data().updatedAt,
  } as User);

const filterVisibleUsers = (users: User[], currentUid: string) =>
  users.filter(user => user.uid && user.uid !== currentUid);

const matchesUserQuery = (user: User, lowercaseQuery: string) =>
  (user.displayNameLowercase || user.displayName || '')
    .toLowerCase()
    .includes(lowercaseQuery) ||
  (user.emailLowercase || user.email || '')
    .toLowerCase()
    .includes(lowercaseQuery);

const searchUserField = async (field: string, lowercaseQuery: string) => {
  const snapshot = await firestore()
    .collection('users')
    .orderBy(field)
    .startAt(lowercaseQuery)
    .endAt(`${lowercaseQuery}\uf8ff`)
    .limit(25)
    .get();

  return snapshot.docs.map(mapUserDoc);
};

export const searchUsers = async (
  query: string,
  currentUid: string,
): Promise<User[]> => {
  const lowercaseQuery = normalizeSearchValue(query);
  if (!lowercaseQuery) return [];

  const [nameResults, emailResults, legacySnapshot] = await Promise.all([
    searchUserField('displayNameLowercase', lowercaseQuery),
    searchUserField('emailLowercase', lowercaseQuery),
    firestore().collection('users').limit(50).get(),
  ]);

  const usersByUid = new Map<string, User>();
  [...nameResults, ...emailResults, ...legacySnapshot.docs.map(mapUserDoc)]
    .filter(user => matchesUserQuery(user, lowercaseQuery))
    .forEach(user => usersByUid.set(user.uid, user));

  return filterVisibleUsers(Array.from(usersByUid.values()), currentUid);
};

export const getAllUsers = async (currentUid: string): Promise<User[]> => {
  try {
    const snapshot = await firestore().collection('users').get();
    return filterVisibleUsers(snapshot.docs.map(mapUserDoc), currentUid);
  } catch (e) {
    console.error('getAllUsers error:', e);
    return [];
  }
};

export const getUserById = async (uid: string): Promise<User | null> => {
  const snap = await firestore().collection('users').doc(uid).get();
  return documentExists(snap) ? (snap.data() as User) : null;
};

export const seedDemoMate = async () => {
  const uid = 'demo-chat-mate';
  const displayName = 'Chat Mate';
  const email = 'mate@demo.com';

  await firestore()
    .collection('users')
    .doc(uid)
    .set(
      {
        uid,
        displayName,
        displayNameLowercase: normalizeSearchValue(displayName),
        email,
        emailLowercase: normalizeSearchValue(email),
        photoURL: '',
        phoneNumber: '',
        fcmToken: '',
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      },
      {merge: true},
    );
};
