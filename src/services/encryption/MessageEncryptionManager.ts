import EncryptionService, {
  EncryptedMessage,
  EncryptionError,
  EncryptionErrorCode,
  EncryptedFile,
} from './EncryptionService';
import GroupEncryptionManager from './GroupEncryptionManager';
import axios from 'axios';

/**
 * MessageEncryptionManager - Coordinates encryption for message sending flow
 * 
 * This service provides:
 * - Encrypted message sending with automatic session establishment
 * - Recipient device discovery
 * - Encrypted media handling
 * - Progress tracking for large file encryption
 * - Error handling and recovery
 */

export interface RecipientDevice {
  userId: string;
  deviceId: string;
  deviceName: string;
  deviceType: string;
}

export interface EncryptionProgress {
  stage: 'discovering' | 'establishing' | 'encrypting' | 'uploading' | 'complete';
  progress: number; // 0-100
  message: string;
}

export interface SendEncryptedMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SendEncryptedMediaResult {
  success: boolean;
  messageId?: string;
  mediaUrl?: string;
  error?: string;
}

class MessageEncryptionManager {
  private apiBaseUrl: string = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  private progressCallbacks: Map<string, (progress: EncryptionProgress) => void> = new Map();

  /**
   * Send an encrypted text message
   * Coordinates device discovery, session establishment, encryption, and API calls
   * 
   * @param chatId - The chat ID
   * @param recipientIds - Array of recipient user IDs
   * @param content - The message content to encrypt
   * @param messageType - Type of message (default: 'text')
   * @param metadata - Additional message metadata (replyTo, etc.)
   * @returns SendEncryptedMessageResult with success status and message ID
   */
  async sendEncryptedMessage(
    chatId: string,
    recipientIds: string[],
    content: string,
    messageType: string = 'text',
    metadata?: {
      replyTo?: string;
      threadId?: string;
    }
  ): Promise<SendEncryptedMessageResult> {
    const operationId = `${chatId}_${Date.now()}`;
    
    try {
      console.log(`[MessageEncryptionManager] Sending encrypted message to ${recipientIds.length} recipients`);

      // Update progress: Discovering devices
      this.updateProgress(operationId, {
        stage: 'discovering',
        progress: 10,
        message: 'Discovering recipient devices...',
      });

      // Discover all devices for all recipients
      const recipientDevices = await this.discoverRecipientDevices(recipientIds);

      if (recipientDevices.length === 0) {
        throw new EncryptionError(
          EncryptionErrorCode.KEY_DOWNLOAD_FAILED,
          'No devices found for recipients',
          true,
          'Unable to find recipient devices. Please try again.'
        );
      }

      console.log(`[MessageEncryptionManager] Found ${recipientDevices.length} recipient devices`);

      // Update progress: Establishing sessions
      this.updateProgress(operationId, {
        stage: 'establishing',
        progress: 30,
        message: 'Establishing secure connections...',
      });

      // Ensure sessions exist for all recipient devices
      await this.ensureSessionsExist(recipientDevices);

      // Update progress: Encrypting
      this.updateProgress(operationId, {
        stage: 'encrypting',
        progress: 50,
        message: 'Encrypting message...',
      });

      // Encrypt message for each recipient device
      const encryptedMessages = await this.encryptForRecipients(recipientDevices, content);

      // Update progress: Uploading
      this.updateProgress(operationId, {
        stage: 'uploading',
        progress: 80,
        message: 'Sending encrypted message...',
      });

      // Send encrypted message to backend
      const messageId = await this.sendEncryptedMessageToBackend(
        chatId,
        encryptedMessages,
        messageType,
        metadata
      );

      // Update progress: Complete
      this.updateProgress(operationId, {
        stage: 'complete',
        progress: 100,
        message: 'Message sent successfully',
      });

      console.log(`[MessageEncryptionManager] Message sent successfully: ${messageId}`);

      // Clean up progress callback
      this.progressCallbacks.delete(operationId);

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      console.error('[MessageEncryptionManager] Failed to send encrypted message:', error);

      // Clean up progress callback
      this.progressCallbacks.delete(operationId);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send an encrypted media message (image, video, audio, file)
   * Handles file encryption, upload, and encrypted message sending
   * 
   * @param chatId - The chat ID
   * @param recipientIds - Array of recipient user IDs
   * @param fileData - The file data as Uint8Array
   * @param fileName - Original file name
   * @param mimeType - File MIME type
   * @param mediaType - Type of media ('image', 'video', 'audio', 'file')
   * @param metadata - Additional message metadata
   * @returns SendEncryptedMediaResult with success status, message ID, and media URL
   */
  async sendEncryptedMedia(
    chatId: string,
    recipientIds: string[],
    fileData: Uint8Array,
    fileName: string,
    mimeType: string,
    mediaType: 'image' | 'video' | 'audio' | 'file',
    metadata?: {
      replyTo?: string;
      threadId?: string;
    }
  ): Promise<SendEncryptedMediaResult> {
    const operationId = `${chatId}_media_${Date.now()}`;

    try {
      console.log(`[MessageEncryptionManager] Sending encrypted media: ${fileName} (${fileData.length} bytes)`);

      // Update progress: Discovering devices
      this.updateProgress(operationId, {
        stage: 'discovering',
        progress: 5,
        message: 'Discovering recipient devices...',
      });

      // Discover recipient devices
      const recipientDevices = await this.discoverRecipientDevices(recipientIds);

      if (recipientDevices.length === 0) {
        throw new EncryptionError(
          EncryptionErrorCode.KEY_DOWNLOAD_FAILED,
          'No devices found for recipients',
          true,
          'Unable to find recipient devices. Please try again.'
        );
      }

      // Update progress: Establishing sessions
      this.updateProgress(operationId, {
        stage: 'establishing',
        progress: 15,
        message: 'Establishing secure connections...',
      });

      // Ensure sessions exist
      await this.ensureSessionsExist(recipientDevices);

      // Update progress: Encrypting file
      this.updateProgress(operationId, {
        stage: 'encrypting',
        progress: 25,
        message: `Encrypting ${mediaType}...`,
      });

      // Encrypt the file
      const encryptedFile = await EncryptionService.encryptFile(fileData, fileName, mimeType);

      console.log(`[MessageEncryptionManager] File encrypted: ${encryptedFile.ciphertext.length} bytes`);

      // Update progress: Uploading encrypted file
      this.updateProgress(operationId, {
        stage: 'uploading',
        progress: 50,
        message: `Uploading encrypted ${mediaType}...`,
      });

      // Upload encrypted file to backend
      const mediaUrl = await this.uploadEncryptedFile(encryptedFile, chatId);

      console.log(`[MessageEncryptionManager] Encrypted file uploaded: ${mediaUrl}`);

      // Update progress: Encrypting media keys
      this.updateProgress(operationId, {
        stage: 'encrypting',
        progress: 70,
        message: 'Encrypting media keys...',
      });

      // Encrypt the media decryption key for each recipient
      const encryptedMediaKeys = await this.encryptMediaKeysForRecipients(
        recipientDevices,
        encryptedFile
      );

      // Update progress: Sending message
      this.updateProgress(operationId, {
        stage: 'uploading',
        progress: 85,
        message: 'Sending encrypted message...',
      });

      // Send encrypted media message to backend
      const messageId = await this.sendEncryptedMediaMessageToBackend(
        chatId,
        encryptedMediaKeys,
        mediaUrl,
        mediaType,
        encryptedFile,
        metadata
      );

      // Update progress: Complete
      this.updateProgress(operationId, {
        stage: 'complete',
        progress: 100,
        message: 'Media sent successfully',
      });

      console.log(`[MessageEncryptionManager] Encrypted media message sent: ${messageId}`);

      // Clean up progress callback
      this.progressCallbacks.delete(operationId);

      return {
        success: true,
        messageId,
        mediaUrl,
      };
    } catch (error) {
      console.error('[MessageEncryptionManager] Failed to send encrypted media:', error);

      // Clean up progress callback
      this.progressCallbacks.delete(operationId);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Register a progress callback for tracking encryption operations
   * 
   * @param operationId - Unique operation identifier
   * @param callback - Progress callback function
   */
  onProgress(operationId: string, callback: (progress: EncryptionProgress) => void): void {
    this.progressCallbacks.set(operationId, callback);
  }

  /**
   * Update progress for an operation
   * 
   * @param operationId - Unique operation identifier
   * @param progress - Progress information
   */
  private updateProgress(operationId: string, progress: EncryptionProgress): void {
    const callback = this.progressCallbacks.get(operationId);
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Discover all devices for recipient users
   * Fetches device information from backend API
   * 
   * @param recipientIds - Array of recipient user IDs
   * @returns Array of RecipientDevice objects
   */
  private async discoverRecipientDevices(recipientIds: string[]): Promise<RecipientDevice[]> {
    try {
      console.log(`[MessageEncryptionManager] Discovering devices for ${recipientIds.length} recipients`);

      const devicePromises = recipientIds.map(async (userId) => {
        try {
          const response = await axios.get(
            `${this.apiBaseUrl}/api/encryption/devices/${userId}`
          );

          if (!response.data.success) {
            console.warn(`[MessageEncryptionManager] Failed to fetch devices for user ${userId}`);
            return [];
          }

          const devices: RecipientDevice[] = response.data.data.devices.map((device: any) => ({
            userId,
            deviceId: device.deviceId,
            deviceName: device.deviceName,
            deviceType: device.deviceType,
          }));

          return devices;
        } catch (error) {
          console.error(`[MessageEncryptionManager] Error fetching devices for user ${userId}:`, error);
          return [];
        }
      });

      const deviceArrays = await Promise.all(devicePromises);
      const allDevices = deviceArrays.flat();

      console.log(`[MessageEncryptionManager] Discovered ${allDevices.length} total devices`);

      return allDevices;
    } catch (error) {
      console.error('[MessageEncryptionManager] Failed to discover recipient devices:', error);
      throw new EncryptionError(
        EncryptionErrorCode.KEY_DOWNLOAD_FAILED,
        `Failed to discover recipient devices: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true,
        'Unable to retrieve device information. Please check your connection.'
      );
    }
  }

  /**
   * Ensure sessions exist for all recipient devices
   * Automatically establishes sessions for new conversations
   * 
   * @param recipientDevices - Array of recipient devices
   */
  private async ensureSessionsExist(recipientDevices: RecipientDevice[]): Promise<void> {
    try {
      console.log(`[MessageEncryptionManager] Ensuring sessions exist for ${recipientDevices.length} devices`);

      const sessionPromises = recipientDevices.map(async (device) => {
        try {
          // Check if session exists
          const hasSession = await EncryptionService.hasSession(device.userId, device.deviceId);

          if (!hasSession) {
            console.log(`[MessageEncryptionManager] No session with ${device.userId}.${device.deviceId}, establishing...`);

            // Fetch key bundle
            const keyBundle = await EncryptionService.fetchKeyBundle(device.userId, device.deviceId);

            // Create session
            await EncryptionService.createSession(device.userId, device.deviceId, keyBundle);

            console.log(`[MessageEncryptionManager] Session established with ${device.userId}.${device.deviceId}`);
          } else {
            console.log(`[MessageEncryptionManager] Session already exists with ${device.userId}.${device.deviceId}`);
          }

          return { success: true, device };
        } catch (error) {
          console.error(
            `[MessageEncryptionManager] Failed to establish session with ${device.userId}.${device.deviceId}:`,
            error
          );
          return { success: false, device, error };
        }
      });

      const results = await Promise.all(sessionPromises);

      // Check if any sessions failed to establish
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        console.warn(`[MessageEncryptionManager] Failed to establish ${failed.length} sessions`);
        // Continue anyway - we'll encrypt for the devices we can
      }

      const successful = results.filter((r) => r.success).length;
      console.log(`[MessageEncryptionManager] Sessions ready: ${successful}/${recipientDevices.length}`);
    } catch (error) {
      console.error('[MessageEncryptionManager] Failed to ensure sessions exist:', error);
      throw new EncryptionError(
        EncryptionErrorCode.SESSION_CREATION_FAILED,
        `Failed to establish sessions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true,
        'Unable to establish secure connections. Please try again.'
      );
    }
  }

  /**
   * Encrypt message content for all recipient devices
   * 
   * @param recipientDevices - Array of recipient devices
   * @param content - Message content to encrypt
   * @returns Map of encrypted messages keyed by "userId.deviceId"
   */
  private async encryptForRecipients(
    recipientDevices: RecipientDevice[],
    content: string
  ): Promise<Map<string, EncryptedMessage>> {
    try {
      console.log(`[MessageEncryptionManager] Encrypting message for ${recipientDevices.length} devices`);

      const encryptionPromises = recipientDevices.map(async (device) => {
        try {
          const encryptedMessage = await EncryptionService.encryptMessage(
            device.userId,
            device.deviceId,
            content
          );

          return {
            key: `${device.userId}.${device.deviceId}`,
            userId: device.userId,
            deviceId: device.deviceId,
            encryptedMessage,
            success: true,
          };
        } catch (error) {
          console.error(
            `[MessageEncryptionManager] Failed to encrypt for ${device.userId}.${device.deviceId}:`,
            error
          );
          return {
            key: `${device.userId}.${device.deviceId}`,
            userId: device.userId,
            deviceId: device.deviceId,
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false,
          };
        }
      });

      const results = await Promise.all(encryptionPromises);

      // Build result map
      const encryptedMessages = new Map<string, EncryptedMessage>();
      results.forEach((result) => {
        if (result.success && result.encryptedMessage) {
          encryptedMessages.set(result.key, result.encryptedMessage);
        }
      });

      console.log(
        `[MessageEncryptionManager] Encrypted for ${encryptedMessages.size}/${recipientDevices.length} devices`
      );

      if (encryptedMessages.size === 0) {
        throw new EncryptionError(
          EncryptionErrorCode.ENCRYPTION_FAILED,
          'Failed to encrypt message for any recipient',
          true,
          'Unable to encrypt message. Please try again.'
        );
      }

      return encryptedMessages;
    } catch (error) {
      console.error('[MessageEncryptionManager] Failed to encrypt for recipients:', error);
      throw error;
    }
  }

  /**
   * Encrypt media decryption keys for all recipient devices
   * 
   * @param recipientDevices - Array of recipient devices
   * @param encryptedFile - The encrypted file containing the decryption key
   * @returns Map of encrypted media keys keyed by "userId.deviceId"
   */
  private async encryptMediaKeysForRecipients(
    recipientDevices: RecipientDevice[],
    encryptedFile: EncryptedFile
  ): Promise<Map<string, EncryptedMessage>> {
    try {
      console.log(`[MessageEncryptionManager] Encrypting media keys for ${recipientDevices.length} devices`);

      // Serialize the media decryption key and IV
      const mediaKeyData = JSON.stringify({
        key: Array.from(encryptedFile.key),
        iv: Array.from(encryptedFile.iv),
        authTag: Array.from(encryptedFile.authTag),
        originalName: encryptedFile.originalName,
        mimeType: encryptedFile.mimeType,
        size: encryptedFile.size,
      });

      // Encrypt the media key data for each recipient
      return await this.encryptForRecipients(recipientDevices, mediaKeyData);
    } catch (error) {
      console.error('[MessageEncryptionManager] Failed to encrypt media keys:', error);
      throw error;
    }
  }

  /**
   * Send encrypted message to backend API
   * Backend will store encrypted messages for offline devices and deliver when they come online
   * 
   * @param chatId - The chat ID
   * @param encryptedMessages - Map of encrypted messages
   * @param messageType - Type of message
   * @param metadata - Additional message metadata
   * @returns Message ID
   */
  private async sendEncryptedMessageToBackend(
    chatId: string,
    encryptedMessages: Map<string, EncryptedMessage>,
    messageType: string,
    metadata?: {
      replyTo?: string;
      threadId?: string;
    }
  ): Promise<string> {
    try {
      console.log(`[MessageEncryptionManager] Sending encrypted message to backend`);

      // Convert encrypted messages to API format
      // Each device gets its own encrypted copy
      // Backend will store messages for offline devices and deliver when they come online
      const recipientDevices = Array.from(encryptedMessages.entries()).map(([key, encryptedMsg]) => {
        const [userId, deviceId] = key.split('.');
        return {
          userId,
          deviceId,
          encryptedContent: this.uint8ArrayToBase64(encryptedMsg.body),
          messageType: encryptedMsg.type,
          registrationId: encryptedMsg.registrationId,
          // Mark for later delivery if device is offline
          storeForOffline: true,
        };
      });

      const payload = {
        chatId,
        recipientDevices,
        messageType,
        metadata: {
          timestamp: Date.now(),
          ...metadata,
        },
      };

      const response = await axios.post(
        `${this.apiBaseUrl}/api/messages/encrypted`,
        payload
      );

      if (!response.data.success) {
        throw new Error('Failed to send encrypted message');
      }

      return response.data.messageId;
    } catch (error) {
      console.error('[MessageEncryptionManager] Failed to send encrypted message to backend:', error);
      throw new EncryptionError(
        EncryptionErrorCode.KEY_UPLOAD_FAILED,
        `Failed to send encrypted message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true,
        'Unable to send encrypted message. Please check your connection.'
      );
    }
  }

  /**
   * Upload encrypted file to backend
   * 
   * @param encryptedFile - The encrypted file data
   * @param chatId - The chat ID
   * @returns URL of the uploaded encrypted file
   */
  private async uploadEncryptedFile(encryptedFile: EncryptedFile, chatId: string): Promise<string> {
    try {
      console.log(`[MessageEncryptionManager] Uploading encrypted file (${encryptedFile.ciphertext.length} bytes)`);

      // Create a FormData object for file upload
      const formData = new FormData();
      
      // Convert Uint8Array to Blob
      // Create a new ArrayBuffer copy to avoid SharedArrayBuffer issues
      const arrayBuffer = new ArrayBuffer(encryptedFile.ciphertext.length);
      const view = new Uint8Array(arrayBuffer);
      view.set(encryptedFile.ciphertext);
      const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
      
      // Append the encrypted file
      formData.append('file', blob as any, `encrypted_${encryptedFile.originalName}`);
      formData.append('chatId', chatId);
      formData.append('encrypted', 'true');

      const response = await axios.post(
        `${this.apiBaseUrl}/api/upload/encrypted`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (!response.data.success) {
        throw new Error('Failed to upload encrypted file');
      }

      const mediaUrl = response.data.url || response.data.fileUrl || response.data.path;

      console.log(`[MessageEncryptionManager] Encrypted file uploaded: ${mediaUrl}`);

      return mediaUrl;
    } catch (error) {
      console.error('[MessageEncryptionManager] Failed to upload encrypted file:', error);
      throw new EncryptionError(
        EncryptionErrorCode.KEY_UPLOAD_FAILED,
        `Failed to upload encrypted file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true,
        'Unable to upload encrypted file. Please check your connection.'
      );
    }
  }

  /**
   * Send encrypted media message to backend API
   * 
   * @param chatId - The chat ID
   * @param encryptedMediaKeys - Map of encrypted media keys
   * @param mediaUrl - URL of the uploaded encrypted media
   * @param mediaType - Type of media
   * @param encryptedFile - The encrypted file metadata
   * @param metadata - Additional message metadata
   * @returns Message ID
   */
  private async sendEncryptedMediaMessageToBackend(
    chatId: string,
    encryptedMediaKeys: Map<string, EncryptedMessage>,
    mediaUrl: string,
    mediaType: string,
    encryptedFile: EncryptedFile,
    metadata?: {
      replyTo?: string;
      threadId?: string;
    }
  ): Promise<string> {
    try {
      console.log(`[MessageEncryptionManager] Sending encrypted media message to backend`);

      // Convert encrypted media keys to API format
      const recipientDevices = Array.from(encryptedMediaKeys.entries()).map(([key, encryptedMsg]) => {
        const [userId, deviceId] = key.split('.');
        return {
          userId,
          deviceId,
          encryptedMediaKey: this.uint8ArrayToBase64(encryptedMsg.body),
          messageType: encryptedMsg.type,
          registrationId: encryptedMsg.registrationId,
        };
      });

      const payload = {
        chatId,
        recipientDevices,
        messageType: mediaType,
        mediaUrl,
        mediaMetadata: {
          originalName: encryptedFile.originalName,
          mimeType: encryptedFile.mimeType,
          size: encryptedFile.size,
        },
        metadata: {
          timestamp: Date.now(),
          ...metadata,
        },
      };

      const response = await axios.post(
        `${this.apiBaseUrl}/api/messages/encrypted`,
        payload
      );

      if (!response.data.success) {
        throw new Error('Failed to send encrypted media message');
      }

      return response.data.messageId;
    } catch (error) {
      console.error('[MessageEncryptionManager] Failed to send encrypted media message to backend:', error);
      throw new EncryptionError(
        EncryptionErrorCode.KEY_UPLOAD_FAILED,
        `Failed to send encrypted media message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true,
        'Unable to send encrypted media message. Please check your connection.'
      );
    }
  }

  /**
   * Convert Uint8Array to base64 string
   */
  private uint8ArrayToBase64(array: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < array.length; i++) {
      binary += String.fromCharCode(array[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 string to Uint8Array
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return array;
  }
}

// Export singleton instance
export default new MessageEncryptionManager();
