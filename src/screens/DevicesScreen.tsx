import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import DeviceRegistrationService from '../services/encryption/DeviceRegistrationService';

/**
 * DevicesScreen - Manage user devices for multi-device encryption
 * 
 * Features:
 * - List all user devices
 * - Display device name, type, and last active timestamp
 * - Remove device action with confirmation
 * - Indicate current device
 * - Show device trust status
 */

interface Device {
  deviceId: string;
  deviceName: string;
  deviceType: 'ios' | 'android' | 'web' | 'desktop';
  registeredAt: string;
  lastActive: string;
  trusted: boolean;
}

interface DevicesScreenProps {
  navigation: any;
  route: any;
}

const DevicesScreen: React.FC<DevicesScreenProps> = ({ navigation, route }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

  const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  const userId = route.params?.userId;
  const authToken = route.params?.authToken;

  /**
   * Fetch devices from server
   */
  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);

      // Get current device ID
      const deviceId = DeviceRegistrationService.getCurrentDeviceId();
      setCurrentDeviceId(deviceId);

      // Fetch devices from server
      const response = await axios.get(
        `${apiBaseUrl}/api/encryption/devices/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      setDevices(response.data.data.devices);
    } catch (error) {
      console.error('[DevicesScreen] Failed to fetch devices:', error);
      Alert.alert('Error', 'Failed to load devices. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, authToken, apiBaseUrl]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  /**
   * Handle refresh
   */
  const handleRefresh = () => {
    setRefreshing(true);
    fetchDevices();
  };

  /**
   * Handle device removal
   */
  const handleRemoveDevice = (device: Device) => {
    // Prevent removing current device
    if (device.deviceId === currentDeviceId) {
      Alert.alert(
        'Cannot Remove',
        'You cannot remove the current device. Please use another device to remove this one.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Remove Device',
      `Are you sure you want to remove "${device.deviceName}"? This device will no longer be able to decrypt your messages.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(
                `${apiBaseUrl}/api/encryption/devices/${device.deviceId}`,
                {
                  headers: {
                    Authorization: `Bearer ${authToken}`,
                  },
                }
              );

              // Refresh device list
              fetchDevices();

              Alert.alert('Success', 'Device removed successfully');
            } catch (error) {
              console.error('[DevicesScreen] Failed to remove device:', error);
              Alert.alert('Error', 'Failed to remove device. Please try again.');
            }
          },
        },
      ]
    );
  };

  /**
   * Handle device verification
   */
  const handleVerifyDevice = (device: Device) => {
    // Navigate to security code verification screen
    navigation.navigate('SecurityCode', {
      userId: userId,
      contactId: userId, // Same user, different device
      deviceId: device.deviceId,
      contactName: device.deviceName,
    });
  };

  /**
   * Get device type icon
   */
  const getDeviceIcon = (deviceType: string): string => {
    switch (deviceType) {
      case 'ios':
        return 'phone-portrait-outline';
      case 'android':
        return 'phone-portrait-outline';
      case 'web':
        return 'globe-outline';
      case 'desktop':
        return 'desktop-outline';
      default:
        return 'hardware-chip-outline';
    }
  };

  /**
   * Format last active timestamp
   */
  const formatLastActive = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  /**
   * Render device item
   */
  const renderDeviceItem = ({ item }: { item: Device }) => {
    const isCurrentDevice = item.deviceId === currentDeviceId;

    return (
      <View style={styles.deviceItem}>
        <View style={styles.deviceIconContainer}>
          <Ionicons
            name={getDeviceIcon(item.deviceType) as any}
            size={32}
            color={isCurrentDevice ? '#007AFF' : '#666'}
          />
        </View>

        <View style={styles.deviceInfo}>
          <View style={styles.deviceHeader}>
            <Text style={styles.deviceName}>{item.deviceName}</Text>
            {isCurrentDevice && (
              <View style={styles.currentDeviceBadge}>
                <Text style={styles.currentDeviceText}>This device</Text>
              </View>
            )}
          </View>

          <Text style={styles.deviceType}>
            {item.deviceType.charAt(0).toUpperCase() + item.deviceType.slice(1)}
          </Text>

          <Text style={styles.lastActive}>
            Last active: {formatLastActive(item.lastActive)}
          </Text>

          <View style={styles.deviceActions}>
            {item.trusted ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.verifyButton}
                onPress={() => handleVerifyDevice(item)}
              >
                <Ionicons name="shield-checkmark-outline" size={16} color="#007AFF" />
                <Text style={styles.verifyButtonText}>Verify</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!isCurrentDevice && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveDevice(item)}
          >
            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="hardware-chip-outline" size={64} color="#CCC" />
      <Text style={styles.emptyStateText}>No devices found</Text>
      <Text style={styles.emptyStateSubtext}>
        Your devices will appear here once registered
      </Text>
    </View>
  );

  /**
   * Handle add device
   */
  const handleAddDevice = () => {
    navigation.navigate('LinkDevice', {
      userId,
      authToken,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading devices...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Devices</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddDevice}
        >
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
        <Text style={styles.infoText}>
          Manage devices that can access your encrypted messages
        </Text>
      </View>

      <FlatList
        data={devices}
        renderItem={renderDeviceItem}
        keyExtractor={(item) => item.deviceId}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  addButton: {
    padding: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1976D2',
  },
  listContainer: {
    padding: 16,
  },
  deviceItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  deviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  currentDeviceBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentDeviceText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '500',
  },
  deviceType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  lastActive: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  deviceActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 14,
    color: '#34C759',
    marginLeft: 4,
    fontWeight: '500',
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  verifyButtonText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '500',
  },
  removeButton: {
    padding: 8,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default DevicesScreen;
