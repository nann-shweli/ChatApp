import storage from '@react-native-firebase/storage';

/**
 * Upload an image file for a conversation message.
 * @returns Download URL string
 */
export const uploadImage = async (
  cid: string,
  mid: string,
  localUri: string,
): Promise<string> => {
  const ext = localUri.split('.').pop() ?? 'jpg';
  const path = `media/${cid}/images/${mid}.${ext}`;
  const ref = storage().ref(path);

  await ref.putFile(localUri);
  return ref.getDownloadURL();
};

/**
 * Upload a voice memo for a conversation message.
 * @returns Download URL string
 */
export const uploadVoice = async (
  cid: string,
  mid: string,
  localUri: string,
): Promise<string> => {
  const path = `media/${cid}/voice/${mid}.m4a`;
  const ref = storage().ref(path);

  await ref.putFile(localUri);
  return ref.getDownloadURL();
};

/**
 * Upload a user avatar.
 * @returns Download URL string
 */
export const uploadAvatar = async (
  uid: string,
  localUri: string,
): Promise<string> => {
  const path = `avatars/${uid}`;
  const ref = storage().ref(path);
  await ref.putFile(localUri);
  return ref.getDownloadURL();
};
