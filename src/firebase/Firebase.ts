import {initializeApp, getApps, getApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';
import {getStorage} from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDUJ_NSBCg39bLwsb3ek-CcTeHSwPEOwaA',
  authDomain: 'chatapp-3429f.firebaseapp.com',
  projectId: 'chatapp-3429f',
  storageBucket: 'chatapp-3429f.appspot.com',
  messagingSenderId: '165487971218',
  appId: '1:165487971218:web:bd697a94ac90384c26cf4b',
  measurementId: 'G-SE1CJWF8FK',
};

// Ensure Firebase is initialized only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export {auth, db, storage};
