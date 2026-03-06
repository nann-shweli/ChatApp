import database from '@react-native-firebase/database';
import {TypingPayload} from '../types';

const TYPING_TTL_MS = 5000;
const typingTimers: Record<string, ReturnType<typeof setTimeout>> = {};

/**
 * Set typing indicator for a user in a conversation.
 * The indicator auto-clears after TYPING_TTL_MS on the local side,
 * and the server-side Cloud Function can also clear stale entries.
 */
export const setTyping = (cid: string, uid: string, isTyping: boolean) => {
  const ref = database().ref(`/typing/${cid}/${uid}`);

  if (isTyping) {
    // Clear any existing timer
    if (typingTimers[`${cid}_${uid}`]) {
      clearTimeout(typingTimers[`${cid}_${uid}`]);
    }

    ref.set({
      typing: true,
      expiresAt: Date.now() + TYPING_TTL_MS,
    } as TypingPayload);

    // Auto-clear after TTL
    typingTimers[`${cid}_${uid}`] = setTimeout(() => {
      ref.remove();
    }, TYPING_TTL_MS);
  } else {
    if (typingTimers[`${cid}_${uid}`]) {
      clearTimeout(typingTimers[`${cid}_${uid}`]);
    }
    ref.remove();
  }
};

/**
 * Listen to who is typing in a conversation.
 * Returns a list of uids currently typing (excluding those with expired TTL).
 */
export const listenTyping = (
  cid: string,
  currentUid: string,
  onData: (typingUids: string[]) => void,
): (() => void) => {
  const ref = database().ref(`/typing/${cid}`);
  const handler = ref.on('value', snap => {
    const data = snap.val() as Record<string, TypingPayload> | null;
    if (!data) {
      onData([]);
      return;
    }

    const now = Date.now();
    const typers = Object.entries(data)
      .filter(
        ([uid, payload]) =>
          uid !== currentUid &&
          payload.typing === true &&
          payload.expiresAt > now,
      )
      .map(([uid]) => uid);

    onData(typers);
  });

  return () => ref.off('value', handler);
};

/**
 * Clean up typing state when leaving a conversation.
 */
export const clearTyping = (cid: string, uid: string) => {
  const key = `${cid}_${uid}`;
  if (typingTimers[key]) {
    clearTimeout(typingTimers[key]);
    delete typingTimers[key];
  }
  database().ref(`/typing/${cid}/${uid}`).remove();
};
