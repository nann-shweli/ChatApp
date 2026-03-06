import React from 'react';
import {ActivityIndicator, View, StyleSheet} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {Provider} from 'react-redux';
import {store, useAppSelector} from '../store';
import {useAuth} from '../hooks/useAuth';
import {registerFCMToken} from '../services/notificationService';

// Screens
import LoginScreen from '../screens/Login';
import SignUpScreen from '../screens/SignUp';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import NewChatScreen from '../screens/NewChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';

import StatusBar from '../component/StatusBar';
import {RootStackParamList} from '../types';

const Stack = createStackNavigator<RootStackParamList>();

// Auth guard — chooses navigator based on auth state
const AppNavigator = () => {
  useAuth(); // syncs Firebase auth → Redux

  const user = useAppSelector(state => state.auth.user);
  const loading = useAppSelector(state => state.auth.loading);

  // Register FCM token whenever user logs in
  React.useEffect(() => {
    if (user?.uid) {
      registerFCMToken(user.uid).catch(() => {});
    }
  }, [user?.uid]);

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#128C7E" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{headerShown: false}}
      initialRouteName={user ? 'ChatList' : 'Login'}>
      {user ? (
        // ── Authenticated stack ──────────────────────────────────────────────
        <>
          <Stack.Screen name="ChatList" component={ChatListScreen} />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{headerShown: true, headerBackTitle: ''}}
          />
          <Stack.Screen
            name="NewChat"
            component={NewChatScreen}
            options={{
              headerShown: true,
              headerTitle: 'New Chat',
              headerStyle: {backgroundColor: '#128C7E'},
              headerTintColor: '#fff',
              headerBackTitle: '',
            }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              headerShown: true,
              headerTitle: 'Profile',
              headerStyle: {backgroundColor: '#128C7E'},
              headerTintColor: '#fff',
              headerBackTitle: '',
            }}
          />
          <Stack.Screen
            name="CreateGroup"
            component={CreateGroupScreen}
            options={{
              headerShown: true,
              headerTitle: 'Create Group',
              headerStyle: {backgroundColor: '#128C7E'},
              headerTintColor: '#fff',
              headerBackTitle: '',
            }}
          />
        </>
      ) : (
        // ── Auth stack ───────────────────────────────────────────────────────
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

const AppNavigation = () => {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar />
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
};

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});

export default AppNavigation;
