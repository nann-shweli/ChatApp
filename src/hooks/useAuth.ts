import {useEffect} from 'react';
import auth from '@react-native-firebase/auth';
import {useAppDispatch} from '../store';
import {setUser, setLoading} from '../store/slices/authSlice';
import {syncUserProfile} from '../services/authService';

/**
 * Subscribes to Firebase auth state changes and syncs to Redux.
 * Should be called once at the app root level.
 */
export const useAuth = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(setLoading(true));
    const unsubscribe = auth().onAuthStateChanged(async user => {
      try {
        if (user) {
          // Sync profile in background - do not await here to avoid blocking splash screen
          syncUserProfile({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            phoneNumber: user.phoneNumber,
          }).catch(err => console.error('Sync error:', err));

          dispatch(
            setUser({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
            }),
          );
        } else {
          dispatch(setUser(null));
        }
      } finally {
        dispatch(setLoading(false));
      }
    });

    return unsubscribe;
  }, [dispatch]);
};
