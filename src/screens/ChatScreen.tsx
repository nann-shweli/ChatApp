import React, {useEffect, useCallback, useState, useRef} from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Image,
  TouchableOpacity,
  Text,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useMessages} from '../hooks/useMessages';
import {useTyping} from '../hooks/useTyping';
import {useAppSelector} from '../store';
import {listenPresence} from '../services/presenceService';
import {
  listenMemberReadAt,
  markAsRead,
  sendMessage,
} from '../services/chatService';
import {uploadImage} from '../services/storageService';
import {PresenceStatus} from '../types';
import MessageBubble from '../component/MessageBubble';
import MessageInput from '../component/MessageInput';
import TypingIndicator from '../component/TypingIndicator';
import Avatar from '../component/Avatar';
import {format, isToday} from 'date-fns';
import Icon from 'react-native-vector-icons/Ionicons';
import {v4 as uuidv4} from '../utils/uuid';
import {FirebaseFirestoreTypes} from '@react-native-firebase/firestore';

const ChatScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {cid, title, otherUid} = route.params as {
    cid: string;
    title: string;
    otherUid?: string;
  };

  const user = useAppSelector(state => state.auth.user);
  const uid = user?.uid ?? '';

  const {messages, loading, loadingMore, hasMore, fetchMore} = useMessages(cid);
  const {typingUids, onTyping, stopTyping} = useTyping(cid, uid);

  const [otherPresence, setOtherPresence] = useState<PresenceStatus | null>(
    null,
  );
  const [otherLastReadAt, setOtherLastReadAt] =
    useState<FirebaseFirestoreTypes.Timestamp | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  // Presence for direct chats
  useEffect(() => {
    if (!otherUid) return;
    const unsub = listenPresence(otherUid, setOtherPresence);
    return unsub;
  }, [otherUid]);

  // Listen to other member's lastReadAt (for read receipts on my messages)
  useEffect(() => {
    if (!otherUid) return;
    const unsub = listenMemberReadAt(cid, otherUid, setOtherLastReadAt);
    return unsub;
  }, [cid, otherUid]);

  // Mark conversation as read when we open it
  useEffect(() => {
    if (uid) markAsRead(cid, uid).catch(() => {});
  }, [cid, uid]);

  const handleSendText = useCallback(
    async (text: string) => {
      stopTyping();
      await sendMessage({
        cid,
        senderId: uid,
        type: 'text',
        text,
        clientId: uuidv4(),
      });
      markAsRead(cid, uid).catch(() => {});
    },
    [cid, uid, stopTyping],
  );

  const handleSendImage = useCallback(
    async (localUri: string) => {
      setUploading(true);
      try {
        const mid = uuidv4();
        const url = await uploadImage(cid, mid, localUri);
        await sendMessage({
          cid,
          senderId: uid,
          type: 'image',
          mediaUrl: url,
          clientId: mid,
        });
      } catch {
        // TODO: show toast
      } finally {
        setUploading(false);
      }
    },
    [cid, uid],
  );

  const getSubtitle = () => {
    if (!otherUid || !otherPresence) return '';
    if (otherPresence.online) return 'online';
    if (otherPresence.lastSeen) {
      const d = new Date(otherPresence.lastSeen);
      return `last seen ${
        isToday(d) ? format(d, 'HH:mm') : format(d, 'dd/MM/yy HH:mm')
      }`;
    }
    return '';
  };

  const isMessageRead = useCallback(
    (createdAt: any) => {
      if (!otherLastReadAt || !createdAt) return false;
      const msgTime = createdAt.toMillis?.() ?? 0;
      const readTime = otherLastReadAt.toMillis?.() ?? 0;
      return msgTime <= readTime;
    },
    [otherLastReadAt],
  );

  const renderItem = useCallback(
    ({item}: {item: any}) => (
      <MessageBubble
        message={item}
        isMine={item.senderId === uid}
        isRead={isMessageRead(item.createdAt)}
        onImagePress={setLightboxUri}
      />
    ),
    [uid, isMessageRead],
  );

  // Custom header
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerStyle: {backgroundColor: '#128C7E'},
      headerTintColor: '#fff',
      headerLeft: () => (
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}>
            <Icon name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Avatar name={title} size={36} online={otherPresence?.online} />
          <View style={styles.headerTitles}>
            <Text style={styles.headerName} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {getSubtitle()}
            </Text>
          </View>
        </View>
      ),
      headerTitle: '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, title, otherPresence]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      <View style={styles.chatArea}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#128C7E" />
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={item => item.mid ?? item.clientId}
            renderItem={renderItem}
            inverted
            onEndReached={hasMore ? fetchMore : undefined}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator style={styles.loadingMore} color="#128C7E" />
              ) : null
            }
            contentContainerStyle={styles.messageList}
          />
        )}

        {/* Typing indicator */}
        {typingUids.length > 0 && <TypingIndicator typingUids={typingUids} />}
      </View>

      <MessageInput
        onSendText={handleSendText}
        onSendImage={handleSendImage}
        onTyping={onTyping}
        uploading={uploading}
      />

      {/* Image lightbox */}
      <Modal visible={!!lightboxUri} transparent animationType="fade">
        <TouchableOpacity
          style={styles.lightboxBg}
          onPress={() => setLightboxUri(null)}
          activeOpacity={1}>
          {lightboxUri && (
            <Image
              source={{uri: lightboxUri}}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#ECE5DD'},
  chatArea: {flex: 1},
  messageList: {paddingTop: 8, paddingBottom: 8},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  loadingMore: {paddingVertical: 12},
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 16,
  },
  backBtn: {padding: 4},
  headerTitles: {flex: 1},
  headerName: {color: '#fff', fontWeight: '600', fontSize: 15},
  headerSub: {color: 'rgba(255,255,255,0.8)', fontSize: 12},
  lightboxBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {width: '100%', height: '80%'},
});

export default ChatScreen;
