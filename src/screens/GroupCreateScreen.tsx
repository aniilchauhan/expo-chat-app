import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { chatsAPI, usersAPI } from '../api';

const GroupCreateScreen: React.FC<any> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [membersCsv, setMembersCsv] = useState(''); // comma-separated user IDs for simplicity
  const [loading, setLoading] = useState(false);

  const onCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Group name is required');
      return;
    }
    try {
      setLoading(true);
      const participants = membersCsv
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const chat = await chatsAPI.createChat({ type: 'group', name: name.trim(), description: description.trim(), participants });
      navigation.replace('Chat', { chatId: chat._id || chat.id });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Group</Text>
      <TextInput style={styles.input} placeholder="Group name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Description (optional)" value={description} onChangeText={setDescription} />
      <TextInput style={styles.input} placeholder="Member IDs (comma-separated)" value={membersCsv} onChangeText={setMembersCsv} />
      <TouchableOpacity style={styles.button} onPress={onCreate} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Creating…' : 'Create'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 10 },
  button: { backgroundColor: '#2196f3', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});

export default GroupCreateScreen;
