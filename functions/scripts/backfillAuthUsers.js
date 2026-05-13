const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const googleServicesPath = path.join(
  __dirname,
  '..',
  '..',
  'google-services.json',
);

const getProjectId = () => {
  if (process.env.GCLOUD_PROJECT) {
    return process.env.GCLOUD_PROJECT;
  }
  if (process.env.GOOGLE_CLOUD_PROJECT) {
    return process.env.GOOGLE_CLOUD_PROJECT;
  }
  if (fs.existsSync(serviceAccountPath)) {
    return require(serviceAccountPath).project_id;
  }
  if (fs.existsSync(googleServicesPath)) {
    return require(googleServicesPath).project_info?.project_id;
  }
  return undefined;
};

if (fs.existsSync(serviceAccountPath)) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
  });
} else {
  const projectId = getProjectId();
  if (!projectId) {
    throw new Error(
      'Missing Firebase project ID. Add functions/serviceAccountKey.json or set GOOGLE_APPLICATION_CREDENTIALS and GOOGLE_CLOUD_PROJECT.',
    );
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
  });
}

const db = admin.firestore();

const normalizeSearchValue = value => value?.trim().toLowerCase() ?? '';

const buildUserProfileData = user => {
  const email = normalizeSearchValue(user.email);
  const displayName = user.displayName?.trim() || email || 'Unknown User';

  return {
    uid: user.uid,
    displayName,
    displayNameLowercase: normalizeSearchValue(displayName),
    email,
    emailLowercase: email,
    photoURL: user.photoURL ?? '',
    phoneNumber: user.phoneNumber ?? '',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
};

const upsertUserProfile = async user => {
  const userRef = db.collection('users').doc(user.uid);
  const snap = await userRef.get();

  await userRef.set(
    {
      ...buildUserProfileData(user),
      fcmToken: snap.data()?.fcmToken ?? '',
      createdAt:
        snap.data()?.createdAt ?? admin.firestore.FieldValue.serverTimestamp(),
    },
    {merge: true},
  );
};

const run = async () => {
  let nextPageToken;
  let syncedCount = 0;

  do {
    const result = await admin.auth().listUsers(1000, nextPageToken);
    await Promise.all(result.users.map(upsertUserProfile));
    syncedCount += result.users.length;
    nextPageToken = result.pageToken;
  } while (nextPageToken);

  console.log(`Synced ${syncedCount} Auth users to Firestore users.`);
};

run()
  .then(() => process.exit(0))
  .catch(error => {
    if (
      error?.reason === 'SERVICE_DISABLED' ||
      error?.errorInfoMetadata?.service === 'firestore.googleapis.com'
    ) {
      console.error(
        [
          'Cloud Firestore is disabled for this Firebase project.',
          '',
          'Enable it here:',
          '  https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=chatapp-3429f',
          '',
          'Then create the Firestore database in Firebase Console:',
          '  Firebase Console > Firestore Database > Create database',
          '',
          'After it is enabled, wait a few minutes and rerun:',
          '  npm --prefix functions run backfill:auth-users',
          '',
          'The app cannot find users until Auth users are copied into Firestore users/{uid}.',
        ].join('\n'),
      );
    } else if (
      error?.codePrefix === 'app' ||
      error?.code?.startsWith?.('app/')
    ) {
      console.error(
        [
          error.message,
          '',
          'Backfill needs Firebase Admin credentials.',
          'Recommended: download a Firebase service account JSON and save it as:',
          '  functions/serviceAccountKey.json',
          '',
          'Firebase Console path:',
          '  Project settings > Service accounts > Generate new private key',
          '',
          'Then run:',
          '  npm --prefix functions run backfill:auth-users',
        ].join('\n'),
      );
    } else {
      console.error(error);
    }
    process.exit(1);
  });
