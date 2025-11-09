import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { usersAPI } from '../api';

const ProfileScreen: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await usersAPI.getProfile();
        setFirstName(profile.firstName || '');
        setLastName(profile.lastName || '');
        setUsername(profile.username || '');
        setStatus(profile.status || '');
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const onSave = async () => {
    try {
      setSaving(true);
      await usersAPI.updateProfile({ firstName, lastName, username, status });
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}> 
        <ActivityIndicator size="large" color="#2196f3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <Text style={styles.label}>First name</Text>
      <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First name" />

      <Text style={styles.label}>Last name</Text>
      <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last name" />

      <Text style={styles.label}>Username</Text>
      <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Username" autoCapitalize="none" />

      <Text style={styles.label}>Status</Text>
      <TextInput style={[styles.input, styles.multiline]} value={status} onChangeText={setStatus} placeholder="Hey there! I am using ChatApp" multiline numberOfLines={3} />

      <TouchableOpacity style={styles.button} onPress={onSave} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save changes'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, { backgroundColor: '#555' }]} onPress={() => (global as any).navigationRef?.navigate?.('Settings')}>
        <Text style={styles.buttonText}>Open Settings</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 12, color: '#666', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, backgroundColor: 'white' },
  multiline: { height: 80, textAlignVertical: 'top' },
  button: { marginTop: 20, backgroundColor: '#2196f3', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '600' },
});

export default ProfileScreen;


