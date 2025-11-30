import { Platform } from 'react-native';
import * as Device from 'expo-device';
import EncryptionService from './EncryptionService';
import KeyStorageService from '../KeyStorageService';
import axios from 'axios';

/**
 * DeviceRegistrationService - Handles device registration and management
 * 
 * This service provides:
 * - Device registration with key generation
 * - Device naming and type detection
 * - Device linking for multi-device support
 */

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: 'ios' | 'android' | 'web' | 'desktop';
  registeredAt: Date;
}

export interface DeviceLinkingRequest {
  linkingCode: string;
  deviceName: string;
  deviceType: string;
}

class DeviceRegistrationService {
  private apiBaseUrl: string = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  private currentDeviceId: string | null = null;

  /**
   * Detect device type based on platform
   */
  private detectDeviceType(): 'ios' | 'android' | 'web' | 'desktop' {
    if (Platform.OS === 'ios') {
      return 'ios';
    } else if (Platform.OS === 'android') {
      return 'android';
    } else if (Platform.OS === 'web') {
      return 'web';
    } else {
      return 'desktop';
    }
  }

  /**
   * Generate a human-readable device name
   * Examples: "iPhone 13", "Samsung Galaxy S21", "Chrome on Windows"
   */
  async generateDeviceName(): Promise<string> {
    try {
      const deviceType = this.detectDeviceType();

      if (deviceType === 'ios' || deviceType === 'android') {
        // Get device model name
        const modelName = Device.modelName || 'Unknown Device';
        const osVersion = Device.osVersion || '';
        
        // Format: "iPhone 13" or "Samsung Galaxy S21"
        return modelName;
      } else if (deviceType === 'web') {
        // For web, use browser and OS info
        const userAgent = navigator.userAgent;
        let browser = 'Browser';
        let os = 'Unknown OS';

        // Detect browser
        if (userAgent.indexOf('Chrome') > -1) {
          browser = 'Chrome';
        } else if (userAgent.indexOf('Safari') > -1) {
          browser = 'Safari';
        } else if (userAgent.indexOf('Firefox') > -1) {
          browser = 'Firefox';
        } else if (userAgent.indexOf('Edge') > -1) {
          browser = 'Edge';
        }

        // Detect OS
        if (userAgent.indexOf('Win') > -1) {
          os = 'Windows';
        } else if (userAgent.indexOf('Mac') > -1) {
          os = 'macOS';
        } else if (userAgent.indexOf('Linux') > -1) {
          os = 'Linux';
        }

        return `${browser} on ${os}`;
      } else {
        return 'Desktop App';
      }
    } catch (error) {
      console.error('[DeviceRegistrationService] Failed to generate device name:', error);
      return 'Unknown Device';
    }
  }

  /**
   * Generate a unique device ID
   */
  private generateDeviceId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const deviceType = this.detectDeviceType();
    return `${deviceType}_${timestamp}_${random}`;
  }

  /**
   * Register device and upload encryption keys
   * This is the main device registration flow
   * 
   * @param userId - The user ID to register the device for
   * @param authToken - Authentication token for API calls
   * @param customDeviceName - Optional custom device name
   * @returns DeviceInfo containing device details
   */
  async registerDevice(
    userId: string,
    authToken: string,
    customDeviceName?: string
  ): Promise<DeviceInfo> {
    try {
      console.log('[DeviceRegistrationService] Starting device registration for user:', userId);

      // Generate device ID
      const deviceId = this.generateDeviceId();
      this.currentDeviceId = deviceId;

      // Generate device name
      const deviceName = customDeviceName || await this.generateDeviceName();
      const deviceType = this.detectDeviceType();

      console.log('[DeviceRegistrationService] Device info:', { deviceId, deviceName, deviceType });

      // Initialize encryption service
      await EncryptionService.initialize(userId, deviceId);

      // Generate identity key pair (already done in initialize, but ensure it exists)
      let identityKeyPair = await KeyStorageService.getIdentityKeyPair();
      if (!identityKeyPair) {
        identityKeyPair = await EncryptionService.generateIdentityKeyPair();
        await KeyStorageService.storeIdentityKeyPair(identityKeyPair);
      }

      // Generate pre-keys
      console.log('[DeviceRegistrationService] Generating pre-keys...');
      const preKeys = await EncryptionService.generatePreKeys(100);

      // Generate signed pre-key
      console.log('[DeviceRegistrationService] Generating signed pre-key...');
      const signedPreKey = await EncryptionService.generateSignedPreKey();

      // Prepare registration payload
      const payload = {
        deviceId,
        deviceName,
        deviceType,
        identityKey: this.uint8ArrayToBase64(identityKeyPair.publicKey),
        signedPreKey: {
          keyId: signedPreKey.keyId,
          publicKey: this.uint8ArrayToBase64(signedPreKey.publicKey),
          signature: this.uint8ArrayToBase64(signedPreKey.signature),
        },
        preKeys: preKeys.map(pk => ({
          keyId: pk.keyId,
          publicKey: this.uint8ArrayToBase64(pk.publicKey),
        })),
      };

      // Register device with backend
      console.log('[DeviceRegistrationService] Registering device with backend...');
      const response = await axios.post(
        `${this.apiBaseUrl}/api/encryption/keys/register`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const registeredAt = new Date(response.data.data.registeredAt);

      console.log('[DeviceRegistrationService] Device registered successfully');

      return {
        deviceId,
        deviceName,
        deviceType,
        registeredAt,
      };
    } catch (error) {
      console.error('[DeviceRegistrationService] Device registration failed:', error);
      throw new Error(`Failed to register device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if current device is registered
   */
  async isDeviceRegistered(): Promise<boolean> {
    try {
      const identityKeyPair = await KeyStorageService.getIdentityKeyPair();
      return identityKeyPair !== null;
    } catch (error) {
      console.error('[DeviceRegistrationService] Failed to check device registration:', error);
      return false;
    }
  }

  /**
   * Get current device ID
   */
  getCurrentDeviceId(): string | null {
    return this.currentDeviceId || EncryptionService.getDeviceId();
  }

  /**
   * Link a new device to an existing account
   * This allows users to add additional devices while maintaining encryption
   * 
   * @param userId - The user ID
   * @param authToken - Authentication token
   * @param linkingCode - Code from existing device (for future implementation)
   * @param customDeviceName - Optional custom device name
   * @returns DeviceInfo containing device details
   */
  async linkDevice(
    userId: string,
    authToken: string,
    linkingCode?: string,
    customDeviceName?: string
  ): Promise<DeviceInfo> {
    try {
      console.log('[DeviceRegistrationService] Starting device linking for user:', userId);

      // For now, device linking is the same as registration
      // In a full implementation, this would:
      // 1. Verify the linking code from another device
      // 2. Optionally sync encryption keys from existing device
      // 3. Notify other devices about the new device

      // Perform standard device registration
      const deviceInfo = await this.registerDevice(userId, authToken, customDeviceName);

      console.log('[DeviceRegistrationService] Device linked successfully');

      // TODO: Implement device linking notification to other devices
      // This would notify all other user devices about the new device

      return deviceInfo;
    } catch (error) {
      console.error('[DeviceRegistrationService] Device linking failed:', error);
      throw new Error(`Failed to link device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a linking code for adding new devices
   * This code can be scanned or entered on a new device
   * 
   * @returns Linking code string
   */
  async generateLinkingCode(): Promise<string> {
    try {
      // Generate a random 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // In a full implementation, this code would be:
      // 1. Stored temporarily on the server
      // 2. Associated with the current device
      // 3. Used to verify the new device during linking
      
      console.log('[DeviceRegistrationService] Generated linking code:', code);
      return code;
    } catch (error) {
      console.error('[DeviceRegistrationService] Failed to generate linking code:', error);
      throw new Error('Failed to generate linking code');
    }
  }

  /**
   * Verify a linking code from another device
   * 
   * @param code - The linking code to verify
   * @param authToken - Authentication token
   * @returns True if code is valid
   */
  async verifyLinkingCode(code: string, authToken: string): Promise<boolean> {
    try {
      // In a full implementation, this would:
      // 1. Send the code to the server for verification
      // 2. Check if the code is valid and not expired
      // 3. Return the verification result

      console.log('[DeviceRegistrationService] Verifying linking code:', code);

      // For now, return true as a placeholder
      // TODO: Implement server-side code verification
      return true;
    } catch (error) {
      console.error('[DeviceRegistrationService] Failed to verify linking code:', error);
      return false;
    }
  }

  /**
   * Unregister current device
   * Removes device from server and clears local encryption data
   * 
   * @param authToken - Authentication token
   */
  async unregisterDevice(authToken: string): Promise<void> {
    try {
      const deviceId = this.getCurrentDeviceId();
      if (!deviceId) {
        throw new Error('No device ID found');
      }

      console.log('[DeviceRegistrationService] Unregistering device:', deviceId);

      // Remove device from server
      await axios.delete(
        `${this.apiBaseUrl}/api/encryption/devices/${deviceId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      // Clear local encryption data
      await KeyStorageService.clear();

      this.currentDeviceId = null;

      console.log('[DeviceRegistrationService] Device unregistered successfully');
    } catch (error) {
      console.error('[DeviceRegistrationService] Failed to unregister device:', error);
      throw new Error(`Failed to unregister device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper method to convert Uint8Array to base64
   */
  private uint8ArrayToBase64(array: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < array.length; i++) {
      binary += String.fromCharCode(array[i]);
    }
    return btoa(binary);
  }
}

// Export singleton instance
export default new DeviceRegistrationService();
