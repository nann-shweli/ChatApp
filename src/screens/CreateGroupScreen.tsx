import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput as RNTextInput,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAppSelector} from '../store';
import {getAllUsers, createGroupConversation} from '../services/chatService';
import {User} from '../types';
import Avatar from '../component/Avatar';
import Icon from 'react-native-vector-icons/Ionicons';
import Button from '../component/Button';

const CreateGroupScreen = () => {
  const navigation = useNavigation<any>();
  const user = useAppSelector(state => state.auth.user);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const results = await getAllUsers(user.uid);
        setUsers(results);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchUsers();
  }, [user?.uid]);

  const toggleSelect = useCallback((uid: string) => {
    setSelectedUids(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid],
    );
  }, []);

  const handleCreate = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    if (selectedUids.length === 0) {
      Alert.alert('Error', 'Please select at least one member');
      return;
    }

    setCreating(true);
    try {
      const cid = await createGroupConversation(
        user!.uid,
        selectedUids,
        groupName.trim(),
      );
      navigation.replace('Chat', {cid, title: groupName.trim()});
    } catch (err) {
      Alert.alert('Error', 'Failed to create group');
    }
    setCreating(false);
  };

  const renderItem = ({item}: {item: User}) => {
    const isSelected = selectedUids.includes(item.uid);
    return (
      <TouchableOpacity
        style={styles.userRow}
        onPress={() => toggleSelect(item.uid)}>
        <Avatar uri={item.photoURL} name={item.displayName} size={40} />
        <Text style={styles.userName}>{item.displayName}</Text>
        <Icon
          name={isSelected ? 'checkbox' : 'square-outline'}
          size={24}
          color={isSelected ? '#128C7E' : '#ccc'}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputSection}>
        <RNTextInput
          style={styles.input}
          placeholder="Group Name"
          value={groupName}
          onChangeText={setGroupName}
          autoFocus
        />
        <Text style={styles.countText}>{selectedUids.length} selected</Text>
      </View>

      <View style={styles.divider} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#128C7E" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={u => u.uid}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      <View style={styles.footer}>
        <Button
          label="Create Group"
          onPress={handleCreate}
          loading={creating}
          disabled={!groupName.trim() || selectedUids.length === 0}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},
  inputSection: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 8,
  },
  countText: {fontSize: 13, color: '#888'},
  divider: {height: 8, backgroundColor: '#f5f5f5'},
  list: {paddingBottom: 100},
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  userName: {flex: 1, fontSize: 16, color: '#111'},
  separator: {height: 1, backgroundColor: '#f5f5f5', marginLeft: 68},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
});

export default CreateGroupScreen;
