import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {signIn} from '../services/authService';
import Button from '../component/Button';
import TextInput from '../component/TextInput';
import Svg from '../assets/svg';

const LoginScreen = () => {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // Navigation is handled automatically by auth state change in AppNavigation
    } catch (err: any) {
      Alert.alert('Sign In Failed', 'Invalid email or password');
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
        <View style={styles.hero}>
          <Svg.LoginSvg width={260} height={260} style={styles.icon} />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <View style={styles.form}>
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
            secureTextEntry
            iconName="lock-closed-outline"
          />
        </View>

        <Button label="Sign In" onPress={handleSignIn} loading={loading} />

        <TouchableOpacity
          style={styles.footer}
          onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.footerText}>
            Don't have an account? <Text style={styles.link}>Sign Up</Text>
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
  hero: {alignItems: 'center', marginBottom: 32},
  icon: {},
  title: {fontSize: 28, fontWeight: '700', color: '#111', marginTop: 8},
  subtitle: {fontSize: 15, color: '#666', marginTop: 4},
  form: {gap: 12, marginBottom: 24},
  footer: {marginTop: 20, alignItems: 'center'},
  footerText: {fontSize: 14, color: '#666'},
  link: {color: '#128C7E', fontWeight: '700'},
});

export default LoginScreen;
