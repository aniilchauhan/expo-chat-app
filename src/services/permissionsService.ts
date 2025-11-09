import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import { Alert, Linking, Platform } from 'react-native';
import { PermissionState, PermissionStatus } from '../types/permissions';

class PermissionsService {
  private permissionState: PermissionState = {
    camera: 'undetermined',
    microphone: 'undetermined',
    storage: 'undetermined',
  };

  public getPermissionState(): PermissionState {
    return this.permissionState;
  }

  public async checkPermissions(): Promise<PermissionState> {
    const [cameraStatus, microphoneStatus, storageStatus] = await Promise.all([
      this.checkCameraPermission(),
      this.checkMicrophonePermission(),
      this.checkStoragePermission(),
    ]);

    this.permissionState = {
      camera: cameraStatus,
      microphone: microphoneStatus,
      storage: storageStatus,
    };

    return this.permissionState;
  }

  public async requestPermissions(): Promise<PermissionState> {
    const [cameraStatus, microphoneStatus, storageStatus] = await Promise.all([
      this.requestCameraPermission(),
      this.requestMicrophonePermission(),
      this.requestStoragePermission(),
    ]);

    this.permissionState = {
      camera: cameraStatus,
      microphone: microphoneStatus,
      storage: storageStatus,
    };

    return this.permissionState;
  }

  private async checkCameraPermission(): Promise<PermissionStatus> {
    const { status } = await Camera.getCameraPermissionsAsync();
    return this.mapPermissionStatus(status);
  }

  private async checkMicrophonePermission(): Promise<PermissionStatus> {
    const { status } = await Audio.getPermissionsAsync();
    return this.mapPermissionStatus(status);
  }

  private async checkStoragePermission(): Promise<PermissionStatus> {
    if (Platform.OS === 'ios') {
      return 'granted'; // iOS handles storage access per file through the document picker
    }
    
    const { status } = await MediaLibrary.getPermissionsAsync();
    return this.mapPermissionStatus(status);
  }

  public async requestStoragePermission(): Promise<PermissionStatus> {
    if (Platform.OS === 'ios') {
      return 'granted'; // iOS handles storage access per file through the document picker
    }

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      return this.mapPermissionStatus(status);
    } catch (error) {
      console.error('Error requesting storage permission:', error);
      return 'denied';
    }
    return this.mapPermissionStatus(status);
  }

  public async requestCameraPermission(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await Camera.requestCameraPermissionsAsync();
      if (!canAskAgain && status !== 'granted') {
        this.showPermissionSettings('camera');
      }
      return this.mapPermissionStatus(status);
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return 'denied';
    }
  }

  public async requestMicrophonePermission(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await Audio.requestPermissionsAsync();
      if (!canAskAgain && status !== 'granted') {
        this.showPermissionSettings('microphone');
      }
      return this.mapPermissionStatus(status);
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      return 'denied';
    }
  }

  private mapPermissionStatus(status: string): PermissionStatus {
    switch (status) {
      case 'granted':
        return 'granted';
      case 'denied':
        return 'denied';
      default:
        return 'undetermined';
    }
  }

  private showPermissionSettings(type: 'camera' | 'microphone') {
    Alert.alert(
      'Permission Required',
      `Please enable ${type} access in your device settings to use this feature.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Settings',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          },
        },
      ]
    );
  }

  public async checkAndRequestPermissions(type: 'audio' | 'video'): Promise<boolean> {
    const permissions = await this.checkPermissions();
    const needsPermissions = type === 'video' 
      ? permissions.camera !== 'granted' || permissions.microphone !== 'granted'
      : permissions.microphone !== 'granted';

    if (needsPermissions) {
      const newPermissions = await this.requestPermissions();
      return type === 'video'
        ? newPermissions.camera === 'granted' && newPermissions.microphone === 'granted'
        : newPermissions.microphone === 'granted';
    }

    return true;
  }
}

export default new PermissionsService();
