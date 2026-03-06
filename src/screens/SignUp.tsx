import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {signUp} from '../services/authService';
import Button from '../component/Button';
import TextInput from '../component/TextInput';

const SignUpScreen = () => {
  const navigation = useNavigation<any>();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password, displayName.trim());
      // Navigation handled by auth state change
    } catch (err: any) {
      Alert.alert('Sign Up Failed', err.message ?? 'Please try again');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join the chat</Text>

        <View style={styles.form}>
          <TextInput
            placeholder="Full Name"
            value={displayName}
            onChangeText={setDisplayName}
            iconName="person-outline"
            autoCapitalize="words"
          />
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            iconName="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            iconName="lock-closed-outline"
            secureTextEntry
          />
          <TextInput
            placeholder="Confirm Password"
            value={confirm}
            onChangeText={setConfirm}
            iconName="lock-closed-outline"
            secureTextEntry
          />
        </View>

        <Button
          label="Create Account"
          onPress={handleSignUp}
          loading={loading}
        />

        <TouchableOpacity
          style={styles.footer}
          onPress={() => navigation.navigate('Login')}>
          <Text style={styles.footerText}>
            Already have an account? <Text style={styles.link}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1},
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
  },
  title: {fontSize: 32, fontWeight: '700', color: '#111', marginBottom: 4},
  subtitle: {fontSize: 16, color: '#666', marginBottom: 32},
  form: {gap: 12, marginBottom: 24},
  footer: {marginTop: 20, alignItems: 'center'},
  footerText: {fontSize: 14, color: '#666'},
  link: {color: '#128C7E', fontWeight: '700'},
});

export default SignUpScreen;
