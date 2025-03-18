import {StyleSheet, Text, TouchableOpacity} from 'react-native';

type ButtonProps = {
  label: string;
  onPress?: () => void;
};

const Button = ({label, onPress}: ButtonProps) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  label: {color: '#fff', fontWeight: '700'},
});

export default Button;
