import firebaseApp from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import database from '@react-native-firebase/database';
import messaging from '@react-native-firebase/messaging';

// Native Firebase SDKs auto-initialise from google-services.json / GoogleService-Info.plist
// No manual initializeApp() needed with the native modules.

export {auth, firestore, storage, database, messaging};
export default firebaseApp;
