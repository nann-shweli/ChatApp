import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAppSelector} from '../store';
import {
  searchUsers,
  getAllUsers,
  getOrCreateDirectConversation,
} from '../services/chatService';
import {User} from '../types';
import SearchBar from '../component/SearchBar';
import Avatar from '../component/Avatar';
import Icon from 'react-native-vector-icons/Ionicons';

const NewChatScreen = () => {
  const navigation = useNavigation<any>();
  const user = useAppSelector(state => state.auth.user);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingCid, setCreatingCid] = useState<string | null>(null);

  useEffect(() => {
    const fetchDefault = async () => {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const users = await getAllUsers(user.uid);
        setResults(users);
      } catch {
        setResults([]);
      }
      setLoading(false);
    };
    if (query.length === 0) {
      fetchDefault();
    }
  }, [user?.uid, query.length]);
  const handleSearch = useCallback(
    async (text: string) => {
      setQuery(text);
      if (text.trim().length < 1) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const users = await searchUsers(text.trim(), user?.uid ?? '');
        setResults(users);
      } catch {
        setResults([]);
      }
      setLoading(false);
    },
    [user?.uid],
  );

  const handleSelectUser = useCallback(
    async (otherUser: User) => {
      if (!user?.uid) return;
      setCreatingCid(otherUser.uid);
      try {
        const cid = await getOrCreateDirectConversation(
          user.uid,
          otherUser.uid,
        );
        navigation.replace('Chat', {
          cid,
          title: otherUser.displayName,
          otherUid: otherUser.uid,
        });
      } catch {
        setCreatingCid(null);
      }
    },
    [user?.uid, navigation],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>New Chat</Text>
      </View>

      <SearchBar
        value={query}
        onChangeText={handleSearch}
        placeholder="Search by name or email..."
      />

      {query.length === 0 && (
        <TouchableOpacity
          style={styles.newGroupBtn}
          onPress={() => navigation.navigate('CreateGroup')}>
          <View style={styles.iconCircle}>
            <Icon name="people" size={24} color="#fff" />
          </View>
          <Text style={styles.newGroupText}>New Group</Text>
        </TouchableOpacity>
      )}

      {query.length === 0 && results.length > 0 && (
        <Text style={styles.sectionHeader}>Suggested Users</Text>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#128C7E" />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={u => u.uid}
          renderItem={({item}) => (
            <TouchableOpacity
              style={styles.userRow}
              onPress={() => handleSelectUser(item)}
              disabled={creatingCid === item.uid}>
              <Avatar uri={item.photoURL} name={item.displayName} size={44} />
              <View style={styles.userInfo}>
                <Text style={styles.name}>{item.displayName}</Text>
                <Text style={styles.email}>{item.email}</Text>
              </View>
              {creatingCid === item.uid && (
                <ActivityIndicator size="small" color="#128C7E" />
              )}
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            query.length > 0 && !loading ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>No users found</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {fontSize: 22, fontWeight: '700', color: '#111'},
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  userInfo: {flex: 1},
  name: {fontSize: 16, fontWeight: '600', color: '#111'},
  email: {fontSize: 13, color: '#888'},
  separator: {height: 1, backgroundColor: '#f5f5f5', marginLeft: 72},
  emptyText: {fontSize: 15, color: '#999'},
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingVertical: 12,
    letterSpacing: 0.5,
  },
  newGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#128C7E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newGroupText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
});

export default NewChatScreen;
