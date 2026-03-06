import {useEffect, useRef} from 'react';
import {AppState, AppStateStatus} from 'react-native';
import {initPresence} from '../services/presenceService';

/**
 * Initialises RTDB presence for the current user.
 * Handles app state changes (background/foreground) to update presence.
 * Should be called once after the user logs in.
 */
export const usePresence = (uid: string | null) => {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!uid) return;

    // initPresence returns a cleanup function
    cleanupRef.current = initPresence(uid);

    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          // Re-connect presence when app comes to foreground
          cleanupRef.current?.();
          cleanupRef.current = initPresence(uid);
        }
      },
    );

    return () => {
      subscription.remove();
      cleanupRef.current?.();
    };
  }, [uid]);
};
