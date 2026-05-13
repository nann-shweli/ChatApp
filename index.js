/**
 * @format
 */

import {AppRegistry} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import App from './src/App';

// Try to prevent firestore/unavailable in spotty simulator networks
firestore().settings({
  cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
});
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
