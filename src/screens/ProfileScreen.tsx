import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAppSelector} from '../store';
import {signOut, updateUserProfile} from '../services/authService';
import {uploadAvatar} from '../services/storageService';
import {launchImageLibrary} from 'react-native-image-picker';
import Avatar from '../component/Avatar';
import TextInput from '../component/TextInput';
import Button from '../component/Button';
import Icon from 'react-native-vector-icons/Ionicons';

const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const user = useAppSelector(state => state.auth.user);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePickAvatar = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });
    if (result.assets?.[0]?.uri && user?.uid) {
      setUploadingPhoto(true);
      try {
        const url = await uploadAvatar(user.uid, result.assets[0].uri);
        await updateUserProfile(user.uid, {photoURL: url});
        Alert.alert('Success', 'Profile photo updated');
      } catch {
        Alert.alert('Error', 'Could not update photo');
      }
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim() || !user?.uid) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, {displayName: displayName.trim()});
      Alert.alert('Saved', 'Profile updated successfully');
    } catch {
      Alert.alert('Error', 'Could not update profile');
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar section */}
      <View style={styles.avatarSection}>
        <TouchableOpacity
          onPress={handlePickAvatar}
          disabled={uploadingPhoto}
          style={styles.avatarWrapper}>
          <Avatar
            uri={user?.photoURL ?? undefined}
            name={user?.displayName ?? ''}
            size={90}
          />
          <View style={styles.editBadge}>
            {uploadingPhoto ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="camera" size={16} color="#fff" />
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.section}>
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          iconName="person-outline"
          placeholder="Your name"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Email (Your Chat ID)</Text>
        <TouchableOpacity
          style={styles.readOnly}
          onPress={() => {
            Clipboard.setString(user?.email ?? '');
            Alert.alert(
              'Copied',
              'Email copied to clipboard. Share it with others to start a chat!',
            );
          }}>
          <Icon name="mail-outline" size={18} color="#888" />
          <Text style={styles.readOnlyText}>{user?.email}</Text>
          <Icon
            name="copy-outline"
            size={16}
            color="#128C7E"
            style={styles.copyIcon}
          />
        </TouchableOpacity>
        <Text style={styles.hint}>
          Tapping copies your email to share with friends.
        </Text>
      </View>

      <Button label="Save Changes" onPress={handleSave} loading={saving} />

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Icon name="log-out-outline" size={20} color="#e74c3c" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F7F7F7'},
  content: {padding: 24, gap: 16},
  avatarSection: {alignItems: 'center', marginBottom: 8},
  avatarWrapper: {position: 'relative'},
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#128C7E',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F7F7F7',
  },
  section: {gap: 6},
  label: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  readOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 0.4,
    borderColor: '#ddd',
  },
  readOnlyText: {fontSize: 16, color: '#555'},
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fde',
  },
  signOutText: {color: '#e74c3c', fontWeight: '600', fontSize: 16},
  copyIcon: {marginLeft: 'auto'},
  hint: {fontSize: 12, color: '#999', marginTop: 4, fontStyle: 'italic'},
});

export default ProfileScreen;
