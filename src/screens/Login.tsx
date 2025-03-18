import React, {useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {signInWithEmailAndPassword} from 'firebase/auth';

import {auth} from '../firebase/Firebase';
import TextInput from '../component/TextInput';
import Button from '../component/Button';

const LoginScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('nannshweli@gmail.com');
  const [password, setPassword] = useState('password1');
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('User signed in successfully');
      navigation.navigate('Home');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button label="Sign In" onPress={handleSignIn} />
      {error ? <Text>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 16,
    gap: 12,
  },
});

export default LoginScreen;
