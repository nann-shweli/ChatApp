import {
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

type TextInputProps = RNTextInputProps & {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
  iconName?: string;
  iconSize?: number;
  iconColor?: string;
};

const TextInput = ({
  value = '',
  onChangeText,
  placeholder,
  style,
  iconName = '',
  iconSize = 20,
  iconColor = '#888',
  ...rest
}: TextInputProps) => {
  return (
    <View style={styles.content}>
      <Icon name={iconName} size={iconSize} color={iconColor} />
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={[styles.textInput, style]}
        {...rest}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 0.4,
    borderRadius: 8,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  textInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
  },
});

export default TextInput;
