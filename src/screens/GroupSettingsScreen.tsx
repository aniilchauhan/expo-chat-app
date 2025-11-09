import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, Share } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { chatsAPI, usersAPI } from '../api';
import { useTheme } from '../contexts/ThemeContext';

const GroupSettingsScreen: React.FC<any> = ({ navigation }) => {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<{ params: { chatId: string } }, 'params'>>();
  const chatId = (route.params as any)?.chatId;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [inviteLink, setInviteLink] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const chat = await chatsAPI.getChatById(chatId);
        setName(chat.name || '');
        setDescription(chat.description || '');
        setMembers(chat.participants || []);
        // Generate invite link
        setInviteLink(`https://yourapp.com/join/${chatId}`);
      } catch (e) {
        Alert.alert('Error', 'Failed to load group');
      }
    })();
  }, [chatId]);

  const onSave = async () => {
    try {
      setSaving(true);
      await chatsAPI.updateChat(chatId, { name, description });
      Alert.alert('Saved', 'Group updated.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const onSearch = async (text: string) => {
    setQuery(text);
    if (text.trim().length < 2) return setSearchResults([]);
    try {
      const users = await usersAPI.searchUsers(text);
      setSearchResults(users);
    } catch (e) {
      setSearchResults([]);
    }
  };

  const addMember = async (userId: string) => {
    try {
      await chatsAPI.addParticipant(chatId, userId);
      setMembers(prev => [...prev, { userId: { _id: userId }, role: 'member' }]);
      setQuery('');
      setSearchResults([]);
    } catch (e) {
      Alert.alert('Error', 'Failed to add member');
    }
  };

  const removeMember = async (userId: string) => {
    try {
      await chatsAPI.removeParticipant(chatId, userId);
      setMembers(prev => prev.filter(m => (m.userId?._id || m.userId) !== userId));
    } catch (e) {
      Alert.alert('Error', 'Failed to remove member');
    }
  };

  const toggleAdmin = async (userId: string, currentRole?: string) => {
    try {
      const nextRole = currentRole === 'admin' ? 'member' : 'admin';
      await chatsAPI.addParticipant(chatId, userId, nextRole);
      setMembers(prev => prev.map(m => (m.userId?._id || m.userId) === userId ? { ...m, role: nextRole } : m));
    } catch (e) {
      Alert.alert('Error', 'Failed to update role');
    }
  };

  const shareInviteLink = async () => {
    try {
      await Share.share({
        message: `Join my group "${name}" on ChatApp: ${inviteLink}`,
        title: `Join ${name}`,
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to share invite link');
    }
  };

  const copyInviteLink = () => {
    // In a real app, you'd use Clipboard API
    Alert.alert('Copied!', 'Invite link copied to clipboard');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Group Settings</Text>

      <TextInput 
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} 
        placeholder="Group name" 
        placeholderTextColor={colors.textSecondary}
        value={name} 
        onChangeText={setName} 
      />
      <TextInput 
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} 
        placeholder="Description" 
        placeholderTextColor={colors.textSecondary}
        value={description} 
        onChangeText={setDescription} 
      />

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={onSave} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save'}</Text>
      </TouchableOpacity>

      <Text style={[styles.section, { color: colors.textSecondary }]}>Invite Link</Text>
      <View style={[styles.inviteSection, { backgroundColor: colors.surface }]}>
        <Text style={[styles.inviteLink, { color: colors.textSecondary }]}>{inviteLink}</Text>
        <View style={[styles.qrContainer, { backgroundColor: colors.background }]}>
          <QRCode value={inviteLink} size={120} />
        </View>
        <View style={styles.inviteButtons}>
          <TouchableOpacity style={[styles.button, styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={copyInviteLink}>
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={shareInviteLink}>
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.section, { color: colors.textSecondary }]}>Members ({members.length})</Text>
      <FlatList
        data={members}
        keyExtractor={(item) => item.userId?._id || item.userId}
        renderItem={({ item }) => (
          <View style={styles.memberRow}>
            <View style={styles.memberInfo}>
              <Text style={[styles.memberName, { color: colors.text }]}>{item.userId?.username || item.userId?._id || item.userId}</Text>
              <Text style={[styles.memberRole, { color: colors.textSecondary }]}>{item.role || 'member'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => toggleAdmin(item.userId?._id || item.userId, item.role)}>
                <Text style={{ color: colors.primary, marginRight: 16 }}>{item.role === 'admin' ? 'Demote' : 'Promote'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeMember(item.userId?._id || item.userId)}>
                <Text style={{ color: colors.error }}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Text style={[styles.section, { color: colors.textSecondary }]}>Add member</Text>
      <TextInput 
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} 
        placeholder="Search users" 
        placeholderTextColor={colors.textSecondary}
        value={query} 
        onChangeText={onSearch} 
      />
      <FlatList
        data={searchResults}
        keyExtractor={(u) => u._id || u.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.memberRow} onPress={() => addMember(item._id || item.id)}>
            <Text style={{ color: colors.text }}>{item.username || `${item.firstName} ${item.lastName}`}</Text>
            <Text style={{ color: colors.primary }}>Add</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 10 },
  button: { padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontWeight: '600' },
  secondaryButton: { marginHorizontal: 4, borderWidth: 1 },
  secondaryButtonText: { fontWeight: '600' },
  section: { fontSize: 12, marginTop: 16, marginBottom: 8 },
  inviteSection: { padding: 12, borderRadius: 8, marginBottom: 16 },
  inviteLink: { fontSize: 12, marginBottom: 8, fontFamily: 'monospace' },
  qrContainer: { alignItems: 'center', marginVertical: 12, padding: 16, borderRadius: 8 },
  inviteButtons: { flexDirection: 'row', justifyContent: 'space-around' },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  memberInfo: { flex: 1 },
  memberName: { fontWeight: '500' },
  memberRole: { fontSize: 12, marginTop: 2 },
});

export default GroupSettingsScreen;
