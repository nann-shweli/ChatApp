import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {format} from 'date-fns';
import Icon from 'react-native-vector-icons/Ionicons';
import {Message} from '../types';

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  isRead?: boolean; // true if the other member has read this
  showTime?: boolean;
  onImagePress?: (url: string) => void;
}

const formatTime = (ts: any): string => {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return format(date, 'HH:mm');
};

const MessageBubble = ({
  message,
  isMine,
  isRead,
  onImagePress,
}: MessageBubbleProps) => {
  const bubbleStyle = isMine ? styles.mineBubble : styles.theirBubble;
  const textStyle = isMine ? styles.mineText : styles.theirText;

  return (
    <View
      style={[
        styles.wrapper,
        isMine ? styles.wrapperRight : styles.wrapperLeft,
      ]}>
      <View style={[styles.bubble, bubbleStyle]}>
        {/* Image message */}
        {message.type === 'image' && message.mediaUrl ? (
          <TouchableOpacity
            onPress={() => onImagePress?.(message.mediaUrl!)}
            activeOpacity={0.9}>
            <Image source={{uri: message.mediaUrl}} style={styles.mediaImage} />
          </TouchableOpacity>
        ) : null}

        {/* Voice message */}
        {message.type === 'voice' ? (
          <View style={styles.voiceContainer}>
            <Icon
              name="play-circle"
              size={32}
              color={isMine ? '#fff' : '#128C7E'}
            />
            <View style={styles.voiceWave} />
            <Text style={[styles.voiceDuration, textStyle]}>
              {message.mediaDuration
                ? `${Math.floor(message.mediaDuration)}s`
                : '0s'}
            </Text>
          </View>
        ) : null}

        {/* Text message */}
        {message.text ? (
          <Text style={[styles.text, textStyle]}>{message.text}</Text>
        ) : null}

        {/* Time + read receipt */}
        <View style={styles.meta}>
          <Text
            style={[styles.time, isMine ? styles.mineTime : styles.theirTime]}>
            {formatTime(message.createdAt)}
          </Text>
          {isMine && (
            <Icon
              name={isRead ? 'checkmark-done' : 'checkmark'}
              size={14}
              color={isRead ? '#53bdeb' : 'rgba(255,255,255,0.7)'}
              style={styles.tick}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {marginVertical: 2, paddingHorizontal: 8},
  wrapperRight: {alignItems: 'flex-end'},
  wrapperLeft: {alignItems: 'flex-start'},
  bubble: {
    maxWidth: '78%',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 4,
  },
  mineBubble: {
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 2,
  },
  theirBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  text: {fontSize: 15, lineHeight: 20},
  mineText: {color: '#111'},
  theirText: {color: '#111'},
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
    gap: 2,
  },
  time: {fontSize: 11},
  mineTime: {color: 'rgba(0,0,0,0.45)'},
  theirTime: {color: 'rgba(0,0,0,0.45)'},
  tick: {marginLeft: 2},
  mediaImage: {
    width: 220,
    height: 180,
    borderRadius: 8,
    marginBottom: 4,
  },
  voiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  voiceWave: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 1,
  },
  voiceDuration: {fontSize: 12},
});

export default MessageBubble;
