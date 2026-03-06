import {useEffect, useState, useCallback, useRef} from 'react';
import {setTyping as setTypingRTDB, listenTyping, clearTyping} from '../services/typingService';

const TYPING_DEBOUNCE_MS = 500;

/**
 * Hook for sending and receiving typing indicators in a conversation.
 */
export const useTyping = (cid: string, currentUid: string) => {
  const [typingUids, setTypingUids] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Listen to other users typing
  useEffect(() => {
    const unsubscribe = listenTyping(cid, currentUid, setTypingUids);
    return () => {
      unsubscribe();
      clearTyping(cid, currentUid);
    };
  }, [cid, currentUid]);

  /**
   * Call this whenever the user types a character.
   * Automatically clears the typing indicator after inactivity.
   */
  const onTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      setTypingRTDB(cid, currentUid, true);
    }

    // Reset debounce timer
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      setTypingRTDB(cid, currentUid, false);
    }, TYPING_DEBOUNCE_MS);
  }, [cid, currentUid]);

  /**
   * Call this when the user sends a message.
   */
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    isTypingRef.current = false;
    setTypingRTDB(cid, currentUid, false);
  }, [cid, currentUid]);

  return {typingUids, onTyping, stopTyping};
};
