import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export const signIn = async (email: string, password: string) => {
  const credential = await auth().signInWithEmailAndPassword(email, password);
  return credential.user;
};

export const signUp = async (
  email: string,
  password: string,
  displayName: string,
) => {
  const credential = await auth().createUserWithEmailAndPassword(
    email,
    password,
  );
  await credential.user.updateProfile({displayName});

  // Create user document in Firestore
  await firestore()
    .collection('users')
    .doc(credential.user.uid)
    .set({
      uid: credential.user.uid,
      displayName,
      photoURL: '',
      email: email.toLowerCase(),
      fcmToken: '',
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

  return credential.user;
};

export const signOut = async () => {
  await auth().signOut();
};

export const onAuthStateChanged = (
  callback: (user: any | null) => void,
) => {
  return auth().onAuthStateChanged(callback);
};

export const updateUserProfile = async (
  uid: string,
  data: {displayName?: string; photoURL?: string; fcmToken?: string},
) => {
  if (data.displayName || data.photoURL) {
    const update: {displayName?: string; photoURL?: string} = {};
    if (data.displayName) update.displayName = data.displayName;
    if (data.photoURL) update.photoURL = data.photoURL;
    await auth().currentUser?.updateProfile(update);
  }
  await firestore().collection('users').doc(uid).update(data);
};
