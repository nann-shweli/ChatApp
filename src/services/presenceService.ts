import database from '@react-native-firebase/database';
import {PresenceStatus} from '../types';

/**
 * Initialise online presence for the current user.
 * Sets online: true immediately, and registers an onDisconnect handler
 * so Firebase automatically marks them offline when they disconnect.
 */
export const initPresence = (uid: string) => {
  const statusRef = database().ref(`/status/${uid}`);
  const connectedRef = database().ref('.info/connected');

  const onConnect = connectedRef.on('value', snap => {
    if (snap.val() === true) {
      // When we disconnect, set offline
      statusRef.onDisconnect().set({
        online: false,
        lastSeen: database.ServerValue.TIMESTAMP,
      });

      // Set online
      statusRef.set({
        online: true,
        lastSeen: database.ServerValue.TIMESTAMP,
      });
    }
  });

  return () => {
    connectedRef.off('value', onConnect);
    statusRef.set({
      online: false,
      lastSeen: database.ServerValue.TIMESTAMP,
    });
  };
};

/**
 * Listen to a user's presence status.
 */
export const listenPresence = (
  uid: string,
  onData: (status: PresenceStatus) => void,
): (() => void) => {
  const ref = database().ref(`/status/${uid}`);
  const handler = ref.on('value', snap => {
    onData(
      snap.val() ?? {online: false, lastSeen: 0},
    );
  });
  return () => ref.off('value', handler);
};
