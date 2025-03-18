import React, {useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {signInWithEmailAndPassword} from 'firebase/auth';
import {auth} from '../firebase/Firebase';
import Button from '../component/Button';
import TextInput from '../component/TextInput';
import Svg from '../assets/svg';

const LoginScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('User signed in successfully');
      navigation.replace('Home');
    } catch (err) {
      setError('Invalid email or password');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Svg.LoginSvg width={300} height={300} style={styles.icon} />

        <Text style={styles.title}>Login</Text>
        <View style={styles.loginForm}>
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            iconName="mail-outline"
          />
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            iconName="lock-closed-outline"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </View>

      <Button label="Sign In" onPress={handleSignIn} loading={loading} />
      <Text style={styles.footerText}>
        Don't have an account?{' '}
        <Text style={styles.link} onPress={() => navigation.navigate('SignUp')}>
          Sign Up
        </Text>
      </Text>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F7F7F7',
  },
  loginForm: {gap: 12},
  header: {flex: 1, justifyContent: 'center'},
  icon: {alignItems: 'center', alignSelf: 'center'},
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  error: {
    color: 'red',
    marginBottom: 10,
  },
  footerText: {
    marginTop: 15,
    fontSize: 14,
    color: '#666',
    alignSelf: 'center',
  },
  link: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
});
