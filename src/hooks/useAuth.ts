import {useEffect} from 'react';
import auth from '@react-native-firebase/auth';
import {useAppDispatch} from '../store';
import {setUser, setLoading} from '../store/slices/authSlice';

/**
 * Subscribes to Firebase auth state changes and syncs to Redux.
 * Should be called once at the app root level.
 */
export const useAuth = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(setLoading(true));
    const unsubscribe = auth().onAuthStateChanged(user => {
      if (user) {
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
    });

    return unsubscribe;
  }, [dispatch]);
};
