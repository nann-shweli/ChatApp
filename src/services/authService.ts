import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {normalizeSearchValue} from '../utils/userDisplay';

const documentExists = (snap: any) =>
  typeof snap.exists === 'function' ? snap.exists() : Boolean(snap.exists);

const buildUserProfileData = (params: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null;
}) => {
  const email = params.email?.trim() ?? '';
  const displayName = params.displayName?.trim() || email || 'Unknown User';
  const photoURL = params.photoURL ?? '';
  const phoneNumber = params.phoneNumber ?? '';

  return {
    uid: params.uid,
    displayName,
    displayNameLowercase: normalizeSearchValue(displayName),
    email,
    emailLowercase: normalizeSearchValue(email),
    photoURL,
    phoneNumber,
  };
};

export const signIn = async (email: string, password: string) => {
  const credential = await auth().signInWithEmailAndPassword(email, password);
  return credential.user;
};

export const signUp = async (
  email: string,
  password: string,
  displayName: string,
) => {
  const normalizedEmail = email.trim().toLowerCase();
  const credential = await auth().createUserWithEmailAndPassword(
    normalizedEmail,
    password,
  );

  const profileData = buildUserProfileData({
    uid: credential.user.uid,
    email: normalizedEmail,
    displayName,
    photoURL: credential.user.photoURL,
    phoneNumber: credential.user.phoneNumber,
  });

  await credential.user.updateProfile({
    displayName: profileData.displayName,
    photoURL: profileData.photoURL,
  });

  // Create user document in Firestore
  await firestore()
    .collection('users')
    .doc(credential.user.uid)
    .set({
      ...profileData,
      fcmToken: '',
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

  return credential.user;
};

export const signOut = async () => {
  await auth().signOut();
};

export const syncUserProfile = async (user: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null;
}) => {
  const userRef = firestore().collection('users').doc(user.uid);
  const snap = await userRef.get();

  const email = user.email?.trim().toLowerCase() || '';
  let currentDisplayName = user.displayName?.trim() || '';
  const existingData = snap.data();
  if (existingData?.displayName?.trim()) {
    currentDisplayName = existingData.displayName.trim();
  }

  const data = buildUserProfileData({
    uid: user.uid,
    email,
    displayName: currentDisplayName,
    photoURL: user.photoURL ?? existingData?.photoURL ?? '',
    phoneNumber: user.phoneNumber ?? existingData?.phoneNumber ?? '',
  });

  if (
    auth().currentUser &&
    auth().currentUser?.displayName !== data.displayName
  ) {
    await auth().currentUser?.updateProfile({displayName: data.displayName});
  }

  const writeData = {
    ...data,
    lastLoginAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  };

  if (!documentExists(snap)) {
    await userRef.set(
      {
        ...writeData,
        createdAt: firestore.FieldValue.serverTimestamp(),
        fcmToken: '',
      },
      {merge: true},
    );
  } else {
    await userRef.update(writeData);
  }
};

export const onAuthStateChanged = (callback: (user: any | null) => void) => {
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
  const firestoreUpdate = {
    ...data,
    ...(data.displayName !== undefined && {
      displayName: data.displayName.trim(),
      displayNameLowercase: normalizeSearchValue(data.displayName),
    }),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  };
  await firestore().collection('users').doc(uid).update(firestoreUpdate);
};
