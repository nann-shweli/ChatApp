const admin = require('firebase-admin');

// Ensure we have a service account or default creds
const serviceAccount = require('./functions/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function run() {
  try {
    const db = admin.firestore();
    const snap = await db.collection('users').get();
    console.log('Total users in DB by Admin SDK:', snap.docs.length);
    snap.docs.forEach(d => console.log('User:', d.id, d.data().email, d.data().displayName));
  } catch(e) {
    console.error('ERROR reading users:', e);
  }
}
run();
