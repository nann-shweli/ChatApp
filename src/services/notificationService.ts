import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';

/**
 * Request push notification permission and register the FCM token
 * in the user's Firestore document so Cloud Functions can send pushes.
 */
export const registerFCMToken = async (uid: string): Promise<void> => {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (!enabled) return;

  const token = await messaging().getToken();
  await firestore().collection('users').doc(uid).update({fcmToken: token});

  // Refresh token listener
  messaging().onTokenRefresh(async newToken => {
    await firestore().collection('users').doc(uid).update({fcmToken: newToken});
  });
};

/**
 * Set up foreground message handler. Returns an unsubscribe function.
 */
export const onForegroundMessage = (
  handler: (remoteMessage: any) => void,
): (() => void) => {
  return messaging().onMessage(handler);
};
