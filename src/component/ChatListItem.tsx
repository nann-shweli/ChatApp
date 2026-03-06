import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {format, isToday, isYesterday} from 'date-fns';
import {UserConversationItem} from '../types';
import Avatar from './Avatar';

interface ChatListItemProps {
  item: UserConversationItem;
  currentUid: string;
  onPress: () => void;
}

const formatTime = (ts: any): string => {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'dd/MM/yy');
};

const ChatListItem = ({item, currentUid, onPress}: ChatListItemProps) => {
  const isGroup = !item.otherUser;
  const name = isGroup
    ? item.conversation?.name ?? 'Group'
    : item.otherUser?.displayName ?? 'Unknown';
  const photo = isGroup
    ? item.conversation?.photoURL
    : item.otherUser?.photoURL;
  const hasUnread = (item.unreadCount ?? 0) > 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}>
      <Avatar uri={photo} name={name} size={50} />

      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.time, hasUnread && styles.timeUnread]}>
            {formatTime(item.lastMessageAt)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text
            style={[styles.preview, hasUnread && styles.previewBold]}
            numberOfLines={1}>
            {item.lastMessagePreview || 'No messages yet'}
          </Text>
          {hasUnread && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    gap: 12,
  },
  content: {flex: 1, gap: 4},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    flex: 1,
    marginRight: 8,
  },
  time: {fontSize: 12, color: '#999'},
  timeUnread: {color: '#25D366', fontWeight: '600'},
  preview: {fontSize: 14, color: '#666', flex: 1, marginRight: 8},
  previewBold: {color: '#111', fontWeight: '600'},
  badge: {
    backgroundColor: '#25D366',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {color: '#fff', fontSize: 11, fontWeight: '700'},
});

export default ChatListItem;
