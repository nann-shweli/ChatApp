import React, {useCallback} from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useChatList} from '../hooks/useChatList';
import {usePresence} from '../hooks/usePresence';
import {useAppSelector} from '../store';
import ChatListItem from '../component/ChatListItem';
import Avatar from '../component/Avatar';
import Icon from 'react-native-vector-icons/Ionicons';
import SearchBar from '../component/SearchBar';
import {signOut} from '../services/authService';
import {UserConversationItem} from '../types';

const ChatListScreen = () => {
  const navigation = useNavigation<any>();
  const user = useAppSelector(state => state.auth.user);
  const {items, loading} = useChatList(user?.uid ?? null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filteredItems, setFilteredItems] = React.useState<
    UserConversationItem[]
  >([]);

  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(items);
      return;
    }
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = items.filter(item => {
      const name = (
        item.otherUser?.displayName ??
        item.conversation?.name ??
        ''
      ).toLowerCase();
      return name.includes(lowerQuery);
    });
    setFilteredItems(filtered);
  }, [items, searchQuery]);

  // Initialise presence for the current user
  usePresence(user?.uid ?? null);

  const handleOpenChat = useCallback(
    (item: any) => {
      const title =
        item.otherUser?.displayName ?? item.conversation?.name ?? 'Chat';
      navigation.navigate('Chat', {
        cid: item.cid,
        title,
        otherUid: item.otherUser?.uid,
      });
    },
    [navigation],
  );

  const handleSignOut = async () => {
    await signOut();
  };

  const renderItem = useCallback(
    ({item}: {item: any}) => (
      <ChatListItem
        item={item}
        currentUid={user?.uid ?? ''}
        onPress={() => handleOpenChat(item)}
      />
    ),
    [user?.uid, handleOpenChat],
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('NewChat')}
            style={styles.iconBtn}>
            <Icon name="create-outline" size={24} color="#128C7E" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            style={styles.iconBtn}>
            <Avatar
              uri={user?.photoURL ?? undefined}
              name={user?.displayName ?? ''}
              size={32}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search chats..."
        />
      </View>

      {/* Separator */}
      <View style={styles.divider} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#128C7E" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Icon name="chatbubbles-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No conversations yet</Text>
          <TouchableOpacity
            style={styles.newChatBtn}
            onPress={() => navigation.navigate('NewChat')}>
            <Text style={styles.newChatBtnText}>Start a new chat</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={filteredItems}
            keyExtractor={item => item.cid}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              searchQuery ? (
                <View style={styles.center}>
                  <Text style={styles.emptyText}>No matches found</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('NewChat')}
                    style={styles.findNewBtn}>
                    <Text style={styles.findNewBtnText}>Find new people</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
          {/* FAB */}
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate('NewChat')}
            activeOpacity={0.8}>
            <Icon name="chatbubble-ellipses" size={28} color="#fff" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {fontSize: 22, fontWeight: '700', color: '#111'},
  headerActions: {flexDirection: 'row', alignItems: 'center', gap: 8},
  iconBtn: {padding: 4},
  divider: {height: 1, backgroundColor: '#f0f0f0'},
  separator: {height: 1, backgroundColor: '#f5f5f5', marginLeft: 78},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12},
  emptyText: {fontSize: 16, color: '#999'},
  newChatBtn: {
    backgroundColor: '#128C7E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  newChatBtnText: {color: '#fff', fontWeight: '600', fontSize: 15},
  searchContainer: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#128C7E',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  findNewBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#128C7E',
  },
  findNewBtnText: {
    color: '#128C7E',
    fontWeight: '600',
  },
});

export default ChatListScreen;
