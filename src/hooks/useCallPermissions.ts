import { useState } from 'react';
import { Alert, Linking } from 'react-native';
import { PermissionStatus } from '../types/permissions';
import { usePermissions } from '../contexts/PermissionsContext';

interface UseCallPermissionsResult {
  checkCallPermissions: (type: 'audio' | 'video') => Promise<boolean>;
  isCheckingPermissions: boolean;
}

export function useCallPermissions(): UseCallPermissionsResult {
  const { permissions, requestCameraPermission, requestMicrophonePermission } = usePermissions();
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);

  const showPermissionAlert = (type: string) => {
    Alert.alert(
      'Permission Required',
      `${type} permission is required for making calls. Please enable it in your device settings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() }
      ]
    );
  };

  const checkCallPermissions = async (type: 'audio' | 'video'): Promise<boolean> => {
    setIsCheckingPermissions(true);
    try {
      // Always check microphone permission for both audio and video calls
      if (permissions.microphone !== 'granted') {
        const micPermission = await requestMicrophonePermission();
        if (!micPermission) {
          showPermissionAlert('Microphone');
          return false;
        }
      }

      // Check camera permission only for video calls
      if (type === 'video' && permissions.camera !== 'granted') {
        const cameraPermission = await requestCameraPermission();
        if (!cameraPermission) {
          showPermissionAlert('Camera');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking call permissions:', error);
      Alert.alert('Error', 'Failed to check permissions. Please try again.');
      return false;
    } finally {
      setIsCheckingPermissions(false);
    }
  };

  return {
    checkCallPermissions,
    isCheckingPermissions
  };
}
