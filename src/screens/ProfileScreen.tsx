import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { usersAPI } from '../api';
import { useTheme } from '../contexts/ThemeContext';

const ProfileScreen: React.FC = () => {
  const { colors } = useTheme();
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
      <View style={[styles.center, { backgroundColor: colors.background }]}> 
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Profile</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>First name</Text>
      <TextInput 
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} 
        value={firstName} 
        onChangeText={setFirstName} 
        placeholder="First name"
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Last name</Text>
      <TextInput 
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} 
        value={lastName} 
        onChangeText={setLastName} 
        placeholder="Last name"
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Username</Text>
      <TextInput 
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} 
        value={username} 
        onChangeText={setUsername} 
        placeholder="Username" 
        autoCapitalize="none"
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Status</Text>
      <TextInput 
        style={[styles.input, styles.multiline, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} 
        value={status} 
        onChangeText={setStatus} 
        placeholder="Hey there! I am using ChatApp" 
        multiline 
        numberOfLines={3}
        placeholderTextColor={colors.textSecondary}
      />

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={onSave} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save changes'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} onPress={() => (global as any).navigationRef?.navigate?.('Settings')}>
        <Text style={[styles.buttonText, { color: colors.text }]}>Open Settings</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 12, marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12 },
  multiline: { height: 80, textAlignVertical: 'top' },
  button: { marginTop: 20, padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '600' },
});

export default ProfileScreen;


