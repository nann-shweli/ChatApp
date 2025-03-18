import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  loading?: boolean;
};

const Button = ({label, onPress, loading = false}: ButtonProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      disabled={loading}>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  label: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
  },
});

export default Button;
