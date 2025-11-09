import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { List, Divider, Button } from 'react-native-paper';
import { usersAPI } from '../api';
import OfflineStorage from '../services/OfflineStorage';
import { useTheme } from '../contexts/ThemeContext';
import { PermissionStatus } from '../components/permissions/PermissionStatus';

const SettingsScreen: React.FC<any> = ({ navigation }) => {
  const { theme, setTheme, colors } = useTheme();
  const [lastSeenVisible, setLastSeenVisible] = useState(true);
  const [profilePicVisible, setProfilePicVisible] = useState(true);
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [storageInfo, setStorageInfo] = useState({ totalSize: 0, itemCount: 0 });

  useEffect(() => {
    loadSettings();
    loadBlockedUsers();
    loadStorageInfo();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await usersAPI.getSettings();
      if (response.success) {
        const settings = response.settings;
        setLastSeenVisible(settings.lastSeenVisible ?? true);
        setProfilePicVisible(settings.profilePicVisible ?? true);
        setReadReceiptsEnabled(settings.readReceiptsEnabled ?? true);
        setPushNotifications(settings.pushNotifications ?? true);
      }
    } catch (error) {
      console.log('Failed to load settings');
    }
  };

  const loadBlockedUsers = async () => {
    try {
      const response = await usersAPI.getBlockedUsers();
      if (response.success) {
        setBlockedUsers(response.blockedUsers || []);
      }
    } catch (error) {
      console.log('Failed to load blocked users');
    }
  };

  const loadStorageInfo = async () => {
    try {
      const info = await OfflineStorage.getInstance().getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      console.log('Failed to load storage info');
    }
  };

  const saveSettings = async () => {
    try {
      const response = await usersAPI.updateSettings({
        lastSeenVisible,
        profilePicVisible,
        readReceiptsEnabled,
        pushNotifications
      });
      if (response.success) {
        Alert.alert('Success', 'Settings saved successfully');
      } else {
        Alert.alert('Error', response.message || 'Failed to save settings');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const unblockUser = async (userId: string) => {
    try {
      const response = await usersAPI.unblockUser(userId);
      if (response.success) {
        setBlockedUsers(prev => prev.filter(u => u._id !== userId));
        Alert.alert('Success', 'User unblocked');
      } else {
        Alert.alert('Error', response.message || 'Failed to unblock user');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to unblock user');
    }
  };

  const showThemeSelector = () => {
    Alert.alert(
      'Choose Theme',
      'Select your preferred theme',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Light', 
          onPress: () => setTheme('light'),
          style: theme === 'light' ? 'default' : 'default'
        },
        { 
          text: 'Dark', 
          onPress: () => setTheme('dark'),
          style: theme === 'dark' ? 'default' : 'default'
        },
        { 
          text: 'System', 
          onPress: () => setTheme('system'),
          style: theme === 'system' ? 'default' : 'default'
        }
      ]
    );
  };

  const clearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all cached data. You\'ll need to re-download chats and messages when you\'re online again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear Cache', 
          style: 'destructive',
          onPress: async () => {
            try {
              await OfflineStorage.getInstance().clearAllCache();
              await loadStorageInfo();
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          }
        }
      ]
    );
  };

  const formatStorageSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { backgroundColor: colors.surface, color: colors.text }]}>Settings</Text>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
        <List.Item
          title="Change Password"
          titleStyle={{ color: colors.text }}
          left={(props) => <List.Icon {...props} icon="lock" color={colors.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" color={colors.textSecondary} />}
          onPress={() => Alert.alert('Coming Soon', 'Password change will be implemented')}
        />
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Permissions</Text>
        <PermissionStatus />
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Privacy</Text>
        <List.Item
          title="Delete Account"
          titleStyle={{ color: colors.error }}
          left={(props) => <List.Icon {...props} icon="delete" color={colors.error} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" color={colors.textSecondary} />}
          onPress={() => Alert.alert('Warning', 'This action cannot be undone')}
        />
      </View>

      <Divider />

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Privacy</Text>
        <View style={styles.settingRow}>
          <Text style={[styles.settingText, { color: colors.text }]}>Last Seen</Text>
          <Switch
            value={lastSeenVisible}
            onValueChange={setLastSeenVisible}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={lastSeenVisible ? colors.primary : colors.textSecondary}
          />
        </View>
        <View style={styles.settingRow}>
          <Text style={[styles.settingText, { color: colors.text }]}>Profile Picture</Text>
          <Switch
            value={profilePicVisible}
            onValueChange={setProfilePicVisible}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={profilePicVisible ? colors.primary : colors.textSecondary}
          />
        </View>
        <View style={styles.settingRow}>
          <Text style={[styles.settingText, { color: colors.text }]}>Read Receipts</Text>
          <Switch
            value={readReceiptsEnabled}
            onValueChange={setReadReceiptsEnabled}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={readReceiptsEnabled ? colors.primary : colors.textSecondary}
          />
        </View>
        <Button mode="contained" onPress={saveSettings} style={[styles.saveButton, { backgroundColor: colors.primary }]}>
          Save Privacy Settings
        </Button>
      </View>

      <Divider />

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>
        <View style={styles.settingRow}>
          <Text style={[styles.settingText, { color: colors.text }]}>Push Notifications</Text>
          <Switch
            value={pushNotifications}
            onValueChange={setPushNotifications}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={pushNotifications ? colors.primary : colors.textSecondary}
          />
        </View>
        <List.Item
          title="Notification Sounds"
          titleStyle={{ color: colors.text }}
          left={(props) => <List.Icon {...props} icon="volume-high" color={colors.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" color={colors.textSecondary} />}
          onPress={() => Alert.alert('Coming Soon', 'Sound settings will be implemented')}
        />
      </View>

      <Divider />

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Blocked Users</Text>
        {blockedUsers.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No blocked users</Text>
        ) : (
          blockedUsers.map(user => (
            <View key={user._id} style={styles.blockedUserRow}>
              <Text style={[styles.blockedUserName, { color: colors.text }]}>{user.username || user.firstName}</Text>
              <TouchableOpacity onPress={() => unblockUser(user._id)}>
                <Text style={[styles.unblockText, { color: colors.primary }]}>Unblock</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
        <List.Item
          title="Manage Blocked Users"
          titleStyle={{ color: colors.text }}
          left={(props) => <List.Icon {...props} icon="account-remove" color={colors.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" color={colors.textSecondary} />}
          onPress={() => Alert.alert('Coming Soon', 'Blocked users management will be implemented')}
        />
      </View>

      <Divider />

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
        <List.Item
          title="Theme"
          titleStyle={{ color: colors.text }}
          description={theme === 'system' ? 'System Default' : theme === 'dark' ? 'Dark' : 'Light'}
          descriptionStyle={{ color: colors.textSecondary }}
          left={(props) => <List.Icon {...props} icon="theme-light-dark" color={colors.primary} />}
          onPress={showThemeSelector}
        />
        <List.Item
          title="Language"
          titleStyle={{ color: colors.text }}
          left={(props) => <List.Icon {...props} icon="translate" color={colors.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" color={colors.textSecondary} />}
          onPress={() => Alert.alert('Coming Soon', 'Language selection will be implemented')}
        />
      </View>

      <Divider />

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Data & Storage</Text>
        <View style={styles.storageInfo}>
          <Text style={[styles.storageText, { color: colors.textSecondary }]}>
            Cache Size: {formatStorageSize(storageInfo.totalSize)}
          </Text>
          <Text style={[styles.storageText, { color: colors.textSecondary }]}>
            Cached Items: {storageInfo.itemCount}
          </Text>
        </View>
        <List.Item
          title="Clear Cache"
          titleStyle={{ color: colors.text }}
          left={(props) => <List.Icon {...props} icon="delete-sweep" color={colors.primary} />}
          onPress={clearCache}
        />
        <List.Item
          title="Export Data"
          titleStyle={{ color: colors.text }}
          left={(props) => <List.Icon {...props} icon="download" color={colors.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" color={colors.textSecondary} />}
          onPress={() => Alert.alert('Coming Soon', 'Data export will be implemented')}
        />
        <List.Item
          title="Storage Info"
          titleStyle={{ color: colors.text }}
          left={(props) => <List.Icon {...props} icon="database" color={colors.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" color={colors.textSecondary} />}
          onPress={() => Alert.alert('Storage Info', `Total: ${formatStorageSize(storageInfo.totalSize)}\nItems: ${storageInfo.itemCount}`)}
        />
      </View>

      <View style={styles.footer}>
        <Text style={[styles.version, { color: colors.textSecondary }]}>ChatApp v1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', padding: 16 },
  section: { paddingVertical: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', paddingHorizontal: 16, paddingVertical: 8 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  settingText: { fontSize: 16 },
  saveButton: { margin: 16, marginTop: 8 },
  emptyText: { textAlign: 'center', padding: 16, fontStyle: 'italic' },
  blockedUserRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  blockedUserName: { fontSize: 16 },
  unblockText: { fontSize: 14 },
  storageInfo: { paddingHorizontal: 16, paddingVertical: 8 },
  storageText: { fontSize: 14, marginBottom: 4 },
  footer: { alignItems: 'center', padding: 20 },
  version: { fontSize: 12 },
});

export default SettingsScreen;
