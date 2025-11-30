// Note: expo-local-authentication needs to be installed
// Run: npx expo install expo-local-authentication expo-secure-store
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { authAPI } from '../api';

// Type definitions for expo-local-authentication (will be available after installation)
type AuthenticationType = 
  | 'FINGERPRINT'
  | 'FACIAL_RECOGNITION'
  | 'IRIS'
  | 'VOICE';

interface LocalAuthentication {
  hasHardwareAsync(): Promise<boolean>;
  isEnrolledAsync(): Promise<boolean>;
  supportedAuthenticationTypesAsync(): Promise<AuthenticationType[]>;
  authenticateAsync(options: {
    promptMessage?: string;
    cancelLabel?: string;
    disableDeviceFallback?: boolean;
    fallbackLabel?: string;
  }): Promise<{ success: boolean; error?: string }>;
}

// Dynamic import for expo-local-authentication
let LocalAuthentication: LocalAuthentication | null = null;

const loadLocalAuthentication = async () => {
  if (!LocalAuthentication) {
    try {
      LocalAuthentication = require('expo-local-authentication');
    } catch (error) {
      console.warn('expo-local-authentication not installed. Please run: npx expo install expo-local-authentication');
      return null;
    }
  }
  return LocalAuthentication;
};

/**
 * Biometric Authentication Service for React Native
 * Uses expo-local-authentication for device biometric authentication
 */
class BiometricService {
  private readonly BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
  private readonly DEVICE_ID_KEY = 'device_id';

  /**
   * Check if biometric authentication is available on the device
   */
  async isAvailable(): Promise<boolean> {
    try {
      const auth = await loadLocalAuthentication();
      if (!auth) return false;

      const compatible = await auth.hasHardwareAsync();
      if (!compatible) {
        return false;
      }

      const enrolled = await auth.isEnrolledAsync();
      return enrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  /**
   * Get supported biometric types
   */
  async getSupportedTypes(): Promise<AuthenticationType[]> {
    try {
      const auth = await loadLocalAuthentication();
      if (!auth) return [];
      return await auth.supportedAuthenticationTypesAsync();
    } catch (error) {
      console.error('Error getting supported biometric types:', error);
      return [];
    }
  }

  /**
   * Get biometric type name
   */
  getBiometricTypeName(types: AuthenticationType[]): string {
    if (types.includes('FACIAL_RECOGNITION')) {
      return 'face';
    }
    if (types.includes('FINGERPRINT')) {
      return 'fingerprint';
    }
    if (types.includes('IRIS')) {
      return 'iris';
    }
    return 'fingerprint'; // Default
  }

  /**
   * Get or create device ID
   */
  async getDeviceId(): Promise<string> {
    try {
      // Try to get from keychain first (more secure)
      const credentials = await Keychain.getInternetCredentials(this.DEVICE_ID_KEY);
      if (credentials && credentials.password) {
        return credentials.password;
      }

      // Fallback to AsyncStorage
      let deviceId = await AsyncStorage.getItem(this.DEVICE_ID_KEY);
      if (!deviceId) {
        // Generate a unique device ID
        deviceId = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        await AsyncStorage.setItem(this.DEVICE_ID_KEY, deviceId);
        // Also store in keychain
        await Keychain.setInternetCredentials(
          this.DEVICE_ID_KEY,
          'device',
          deviceId
        );
      }
      return deviceId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      throw error;
    }
  }

  /**
   * Check if biometric is enabled locally
   */
  async isEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(this.BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking biometric enabled status:', error);
      return false;
    }
  }

  /**
   * Enable biometric authentication
   */
  async enable(): Promise<void> {
    try {
      // First verify biometric is available
      const available = await this.isAvailable();
      if (!available) {
        throw new Error('Biometric authentication is not available on this device');
      }

      // Authenticate to enable
      const auth = await loadLocalAuthentication();
      if (!auth) {
        throw new Error('Biometric authentication library not available');
      }

      const result = await auth.authenticateAsync({
        promptMessage: 'Enable biometric authentication',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use password'
      });

      if (!result.success) {
        throw new Error('Biometric authentication failed or was cancelled');
      }

      // Get device ID and biometric type
      const deviceId = await this.getDeviceId();
      const supportedTypes = await this.getSupportedTypes();
      const biometricType = this.getBiometricTypeName(supportedTypes);

      // Enable on server
      await authAPI.enableBiometric(deviceId, biometricType);

      // Store locally
      await AsyncStorage.setItem(this.BIOMETRIC_ENABLED_KEY, 'true');

      console.log('Biometric authentication enabled');
    } catch (error) {
      console.error('Error enabling biometric:', error);
      throw error;
    }
  }

  /**
   * Disable biometric authentication
   */
  async disable(): Promise<void> {
    try {
      // Disable on server
      await authAPI.disableBiometric();

      // Remove local storage
      await AsyncStorage.removeItem(this.BIOMETRIC_ENABLED_KEY);

      console.log('Biometric authentication disabled');
    } catch (error) {
      console.error('Error disabling biometric:', error);
      throw error;
    }
  }

  /**
   * Authenticate using biometric
   * This should be called when unlocking the app
   */
  async authenticate(reason?: string): Promise<boolean> {
    try {
      const enabled = await this.isEnabled();
      if (!enabled) {
        return false;
      }

      const available = await this.isAvailable();
      if (!available) {
        return false;
      }

      const auth = await loadLocalAuthentication();
      if (!auth) {
        return false;
      }

      const result = await auth.authenticateAsync({
        promptMessage: reason || 'Authenticate to continue',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use password'
      });

      if (result.success) {
        // Update last used on server
        const deviceId = await this.getDeviceId();
        await authAPI.verifyBiometric(deviceId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error authenticating with biometric:', error);
      return false;
    }
  }

  /**
   * Get biometric status from server
   */
  async getStatus(): Promise<any> {
    try {
      return await authAPI.getBiometricStatus();
    } catch (error) {
      console.error('Error getting biometric status:', error);
      throw error;
    }
  }
}

export default new BiometricService();

