import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePermissions } from '../../contexts/PermissionsContext';
import { PermissionStatus as PermissionStatusType } from '../../types/permissions';

interface PermissionItemProps {
  type: 'camera' | 'microphone' | 'storage';
  status: PermissionStatusType;
  onRequestPermission: () => Promise<void>;
}

const PermissionItem: React.FC<PermissionItemProps> = ({
  type,
  status,
  onRequestPermission,
}) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animate when status changes
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [status]);
  const getIcon = () => {
    switch (type) {
      case 'camera':
        return 'camera';
      case 'microphone':
        return 'mic';
      case 'storage':
        return 'folder';
      default:
        return 'help-circle';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'granted':
        return '#4CAF50';
      case 'denied':
        return '#F44336';
      default:
        return '#FFC107';
    }
  };

  return (
    <Animated.View
      style={[
        styles.permissionItem,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.contentContainer}
        onPress={onRequestPermission}
        disabled={status === 'granted'}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={getIcon()} size={24} color={getStatusColor()} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.permissionType}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Text>
          <Text style={[styles.status, { color: getStatusColor() }]}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Text>
        </View>
        {status !== 'granted' && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <TouchableOpacity 
              style={styles.requestButton} 
              onPress={onRequestPermission}
            >
              <Text style={styles.requestButtonText}>Request</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export const PermissionStatus: React.FC = () => {
  const {
    permissions,
    requestCameraPermission,
    requestMicrophonePermission,
    requestStoragePermission,
  } = usePermissions();

  const handlePermissionRequest = async (
    type: 'camera' | 'microphone' | 'storage',
    requestFn: () => Promise<boolean>
  ) => {
    try {
      const granted = await requestFn();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          `${type.charAt(0).toUpperCase() + type.slice(1)} permission is required for full functionality. Please enable it in your device settings.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch (error) {
      console.error(`Error requesting ${type} permission:`, error);
      Alert.alert('Error', 'Failed to request permission. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>App Permissions</Text>
      <PermissionItem
        type="camera"
        status={permissions.camera}
        onRequestPermission={() => handlePermissionRequest('camera', requestCameraPermission)}
      />
      <PermissionItem
        type="microphone"
        status={permissions.microphone}
        onRequestPermission={() => handlePermissionRequest('microphone', requestMicrophonePermission)}
      />
      <PermissionItem
        type="storage"
        status={permissions.storage}
        onRequestPermission={() => handlePermissionRequest('storage', requestStoragePermission)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  permissionType: {
    fontSize: 16,
    color: '#333',
  },
  status: {
    fontSize: 14,
    marginTop: 2,
  },
  requestButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
