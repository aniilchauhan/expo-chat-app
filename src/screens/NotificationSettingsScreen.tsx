import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Switch, Button, Divider, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { notificationsAPI } from '../api';

export default function NotificationSettingsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    push: {
      enabled: true,
      sound: true,
      preview: true,
    },
    email: {
      enabled: true,
      marketing: false,
    },
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    if (!user?._id) return;
    
    try {
      setLoading(true);
      const response = await notificationsAPI.getPreferences(user._id);
      if (response.success && response.preferences) {
        setPreferences(response.preferences);
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      Alert.alert('Error', 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (category: 'push' | 'email', key: string, value: boolean) => {
    if (!user?._id) return;

    const newPreferences = {
      ...preferences,
      [category]: {
        ...preferences[category],
        [key]: value,
      },
    };

    setPreferences(newPreferences);

    try {
      setSaving(true);
      await notificationsAPI.updatePreferences(user._id, {
        [category]: { [key]: value },
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      Alert.alert('Error', 'Failed to update notification preferences');
      // Revert on error
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  };

  const sendTestNotification = async () => {
    if (!user?._id) return;

    try {
      setSaving(true);
      const response = await notificationsAPI.sendTestNotification(user._id);
      if (response.success) {
        Alert.alert('Success', 'Test notification sent! Check your device.');
      } else {
        Alert.alert('Error', response.message || 'Failed to send test notification');
      }
    } catch (error: any) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', error.message || 'Failed to send test notification');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Push Notifications</Text>
        <Text style={styles.sectionDescription}>
          Manage how you receive push notifications on this device
        </Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Enable Push Notifications</Text>
            <Text style={styles.settingDescription}>
              Receive notifications for new messages
            </Text>
          </View>
          <Switch
            value={preferences.push.enabled}
            onValueChange={(value) => updatePreference('push', 'enabled', value)}
            disabled={saving}
          />
        </View>

        <Divider />

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Sound</Text>
            <Text style={styles.settingDescription}>
              Play sound for notifications
            </Text>
          </View>
          <Switch
            value={preferences.push.sound}
            onValueChange={(value) => updatePreference('push', 'sound', value)}
            disabled={saving || !preferences.push.enabled}
          />
        </View>

        <Divider />

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Message Preview</Text>
            <Text style={styles.settingDescription}>
              Show message content in notifications
            </Text>
          </View>
          <Switch
            value={preferences.push.preview}
            onValueChange={(value) => updatePreference('push', 'preview', value)}
            disabled={saving || !preferences.push.enabled}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Email Notifications</Text>
        <Text style={styles.sectionDescription}>
          Manage email notification preferences
        </Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Enable Email Notifications</Text>
            <Text style={styles.settingDescription}>
              Receive email notifications for important updates
            </Text>
          </View>
          <Switch
            value={preferences.email.enabled}
            onValueChange={(value) => updatePreference('email', 'enabled', value)}
            disabled={saving}
          />
        </View>

        <Divider />

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Marketing Emails</Text>
            <Text style={styles.settingDescription}>
              Receive promotional and marketing emails
            </Text>
          </View>
          <Switch
            value={preferences.email.marketing}
            onValueChange={(value) => updatePreference('email', 'marketing', value)}
            disabled={saving || !preferences.email.enabled}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Button
          mode="outlined"
          onPress={sendTestNotification}
          disabled={saving || !preferences.push.enabled}
          style={styles.testButton}
        >
          Send Test Notification
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 5,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  testButton: {
    marginHorizontal: 16,
    marginVertical: 10,
  },
});
