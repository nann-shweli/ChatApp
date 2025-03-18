import {
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  StyleSheet,
  ViewStyle,
} from 'react-native';

type TextInputProps = RNTextInputProps & {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
};

const TextInput = ({
  value = '',
  onChangeText,
  placeholder,
  style,
  ...rest
}: TextInputProps) => {
  return (
    <RNTextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      style={[styles.textInput, style]}
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  textInput: {
    height: 30,
    borderWidth: 0.4,
    paddingHorizontal: 12,
    borderColor: 'red',
    borderRadius: 8,
  },
});

export default TextInput;
