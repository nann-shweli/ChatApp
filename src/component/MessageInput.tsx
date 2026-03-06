import React, {useState, useRef, useCallback} from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {launchImageLibrary} from 'react-native-image-picker';

interface MessageInputProps {
  onSendText: (text: string) => void;
  onSendImage: (uri: string) => void;
  onTyping: () => void;
  disabled?: boolean;
  uploading?: boolean;
}

const MessageInput = ({
  onSendText,
  onSendImage,
  onTyping,
  disabled,
  uploading,
}: MessageInputProps) => {
  const [text, setText] = useState('');
  const inputRef = useRef<any>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendText(trimmed);
    setText('');
  }, [text, onSendText]);

  const handlePickImage = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });
      if (result.assets && result.assets[0]?.uri) {
        onSendImage(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Could not pick image');
    }
  }, [onSendImage]);

  const hasText = text.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* Attachment button */}
      <TouchableOpacity
        onPress={handlePickImage}
        style={styles.iconBtn}
        disabled={disabled || uploading}>
        {uploading ? (
          <ActivityIndicator size="small" color="#128C7E" />
        ) : (
          <Icon name="attach" size={24} color="#666" />
        )}
      </TouchableOpacity>

      {/* Text input */}
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder="Message"
        placeholderTextColor="#999"
        value={text}
        onChangeText={t => {
          setText(t);
          onTyping();
        }}
        multiline
        maxLength={1000}
        editable={!disabled}
        returnKeyType="default"
      />

      {/* Send button */}
      <TouchableOpacity
        onPress={hasText ? handleSend : undefined}
        style={[styles.sendBtn, hasText && styles.sendBtnActive]}
        disabled={!hasText || disabled}>
        <Icon
          name={hasText ? 'send' : 'mic'}
          size={20}
          color={hasText ? '#fff' : '#666'}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    gap: 6,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    color: '#111',
    maxHeight: 120,
    minHeight: 40,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: '#25D366',
  },
});

export default MessageInput;
