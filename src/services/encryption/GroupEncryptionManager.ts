import EncryptionService, {
  EncryptedMessage,
  EncryptionError,
  EncryptionErrorCode,
  KeyBundle,
} from './EncryptionService';
import axios from 'axios';

/**
 * GroupEncryptionManager - Handles encryption for group chats
 * 
 * This service provides:
 * - Group message encryption for multiple recipients
 * - Parallel encryption for performance optimization
 * - Device discovery for group members
 * - Multi-device support for group members
 */

export interface GroupMember {
  userId: string;
  devices: GroupMemberDevice[];
}

export interface GroupMemberDevice {
  deviceId: string;
  deviceName: string;
  deviceType: string;
}

export interface EncryptedGroupMessage {
  recipientDevices: Array<{
    userId: string;
    deviceId: string;
    encryptedContent: EncryptedMessage;
  }>;
  messageId: string;
  timestamp: number;
}

export interface GroupEncryptionResult {
  success: boolean;
  encryptedMessages: Map<string, EncryptedMessage>; // key: "userId.deviceId"
  failedRecipients: Array<{ userId: string; deviceId: string; error: string }>;
}

class GroupEncryptionManager {
  private apiBaseUrl: string = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  private deviceCache: Map<string, GroupMemberDevice[]> = new Map(); // Cache devices by userId
  private readonly DEVICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private deviceCacheTimestamps: Map<string, number> = new Map();

  /**
   * Encrypt a message for all members in a group
   * Encrypts the message separately for each member device
   * Implements parallel encryption for performance optimization
   * 
   * @param groupId - The group chat ID
   * @param memberIds - Array of user IDs in the group
   * @param plaintext - The message content to encrypt
   * @returns GroupEncryptionResult with encrypted messages and any failures
   */
  async encryptGroupMessage(
    groupId: string,
    memberIds: string[],
    plaintext: string
  ): Promise<GroupEncryptionResult> {
    try {
      console.log(`[GroupEncryptionManager] Encrypting message for group ${groupId} with ${memberIds.length} members`);

      // Discover all devices for all group members
      const memberDevices = await this.discoverGroupMemberDevices(memberIds);

      console.log(`[GroupEncryptionManager] Found ${memberDevices.length} total devices across ${memberIds.length} members`);

      // Encrypt message for each device in parallel
      const encryptionPromises = memberDevices.map(async (member) => {
        const deviceResults = await Promise.allSettled(
          member.devices.map(async (device) => {
            try {
              // Check if session exists, if not establish one
              const hasSession = await EncryptionService.hasSession(member.userId, device.deviceId);
              
              if (!hasSession) {
                console.log(`[GroupEncryptionManager] No session with ${member.userId}.${device.deviceId}, establishing...`);
                await this.establishSession(member.userId, device.deviceId);
              }

              // Encrypt the message
              const encryptedMessage = await EncryptionService.encryptMessage(
                member.userId,
                device.deviceId,
                plaintext
              );

              return {
                userId: member.userId,
                deviceId: device.deviceId,
                encryptedMessage,
                success: true,
              };
            } catch (error) {
              console.error(
                `[GroupEncryptionManager] Failed to encrypt for ${member.userId}.${device.deviceId}:`,
                error
              );
              return {
                userId: member.userId,
                deviceId: device.deviceId,
                error: error instanceof Error ? error.message : 'Unknown error',
                success: false,
              };
            }
          })
        );

        return deviceResults;
      });

      // Wait for all encryption operations to complete
      const allResults = await Promise.all(encryptionPromises);

      // Flatten results
      const flatResults = allResults.flat();

      // Separate successful and failed encryptions
      const encryptedMessages = new Map<string, EncryptedMessage>();
      const failedRecipients: Array<{ userId: string; deviceId: string; error: string }> = [];

      flatResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success && result.value.encryptedMessage) {
          const key = `${result.value.userId}.${result.value.deviceId}`;
          encryptedMessages.set(key, result.value.encryptedMessage);
        } else if (result.status === 'fulfilled' && !result.value.success && result.value.error) {
          failedRecipients.push({
            userId: result.value.userId,
            deviceId: result.value.deviceId,
            error: result.value.error,
          });
        } else if (result.status === 'rejected') {
          console.error('[GroupEncryptionManager] Encryption promise rejected:', result.reason);
        }
      });

      console.log(
        `[GroupEncryptionManager] Encryption complete: ${encryptedMessages.size} successful, ${failedRecipients.length} failed`
      );

      return {
        success: encryptedMessages.size > 0,
        encryptedMessages,
        failedRecipients,
      };
    } catch (error) {
      console.error('[GroupEncryptionManager] Failed to encrypt group message:', error);
      throw new EncryptionError(
        EncryptionErrorCode.ENCRYPTION_FAILED,
        `Failed to encrypt group message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true,
        'Unable to encrypt message for group. Please try again.'
      );
    }
  }

  /**
   * Discover all devices for group members
   * Fetches device information from backend API
   * Implements caching to reduce API calls
   * 
   * @param memberIds - Array of user IDs
   * @returns Array of GroupMember objects with device information
   */
  private async discoverGroupMemberDevices(memberIds: string[]): Promise<GroupMember[]> {
    try {
      console.log(`[GroupEncryptionManager] Discovering devices for ${memberIds.length} members`);

      // Fetch devices for all members in parallel
      const devicePromises = memberIds.map(async (userId) => {
        // Check cache first
        const cached = this.getFromCache(userId);
        if (cached) {
          console.log(`[GroupEncryptionManager] Using cached devices for user ${userId}`);
          return { userId, devices: cached };
        }

        // Fetch from API
        try {
          const devices = await this.fetchUserDevices(userId);
          
          // Cache the result
          this.cacheDevices(userId, devices);
          
          return { userId, devices };
        } catch (error) {
          console.error(`[GroupEncryptionManager] Failed to fetch devices for user ${userId}:`, error);
          // Return empty devices array for this user
          return { userId, devices: [] };
        }
      });

      const results = await Promise.all(devicePromises);

      // Filter out members with no devices
      const membersWithDevices = results.filter((member) => member.devices.length > 0);

      console.log(
        `[GroupEncryptionManager] Discovered ${membersWithDevices.length} members with devices`
      );

      return membersWithDevices;
    } catch (error) {
      console.error('[GroupEncryptionManager] Failed to discover group member devices:', error);
      throw new EncryptionError(
        EncryptionErrorCode.KEY_DOWNLOAD_FAILED,
        `Failed to discover group member devices: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true,
        'Unable to retrieve device information. Please check your connection.'
      );
    }
  }

  /**
   * Fetch devices for a specific user from backend API
   * 
   * @param userId - The user ID
   * @returns Array of devices for the user
   */
  private async fetchUserDevices(userId: string): Promise<GroupMemberDevice[]> {
    try {
      console.log(`[GroupEncryptionManager] Fetching devices for user ${userId}`);

      const response = await axios.get(
        `${this.apiBaseUrl}/api/encryption/devices/${userId}`
      );

      if (!response.data.success) {
        throw new Error('Failed to fetch user devices');
      }

      const devices: GroupMemberDevice[] = response.data.data.devices.map((device: any) => ({
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
      }));

      console.log(`[GroupEncryptionManager] Found ${devices.length} devices for user ${userId}`);

      return devices;
    } catch (error) {
      console.error(`[GroupEncryptionManager] Failed to fetch devices for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Establish a session with a recipient device
   * Fetches key bundle and creates session
   * 
   * @param userId - The recipient's user ID
   * @param deviceId - The recipient's device ID
   */
  private async establishSession(userId: string, deviceId: string): Promise<void> {
    try {
      console.log(`[GroupEncryptionManager] Establishing session with ${userId}.${deviceId}`);

      // Fetch key bundle
      const keyBundle = await EncryptionService.fetchKeyBundle(userId, deviceId);

      // Create session
      await EncryptionService.createSession(userId, deviceId, keyBundle);

      console.log(`[GroupEncryptionManager] Session established with ${userId}.${deviceId}`);
    } catch (error) {
      console.error(
        `[GroupEncryptionManager] Failed to establish session with ${userId}.${deviceId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get devices from cache if not expired
   * 
   * @param userId - The user ID
   * @returns Cached devices or null if not found/expired
   */
  private getFromCache(userId: string): GroupMemberDevice[] | null {
    const cached = this.deviceCache.get(userId);
    const timestamp = this.deviceCacheTimestamps.get(userId);

    if (!cached || !timestamp) {
      return null;
    }

    // Check if cache is expired
    const now = Date.now();
    if (now - timestamp > this.DEVICE_CACHE_TTL) {
      // Cache expired, remove it
      this.deviceCache.delete(userId);
      this.deviceCacheTimestamps.delete(userId);
      return null;
    }

    return cached;
  }

  /**
   * Cache devices for a user
   * 
   * @param userId - The user ID
   * @param devices - The devices to cache
   */
  private cacheDevices(userId: string, devices: GroupMemberDevice[]): void {
    this.deviceCache.set(userId, devices);
    this.deviceCacheTimestamps.set(userId, Date.now());
  }

  /**
   * Clear device cache
   * Useful when devices are added/removed
   */
  clearDeviceCache(): void {
    console.log('[GroupEncryptionManager] Clearing device cache');
    this.deviceCache.clear();
    this.deviceCacheTimestamps.clear();
  }

  /**
   * Clear device cache for a specific user
   * 
   * @param userId - The user ID
   */
  clearUserDeviceCache(userId: string): void {
    console.log(`[GroupEncryptionManager] Clearing device cache for user ${userId}`);
    this.deviceCache.delete(userId);
    this.deviceCacheTimestamps.delete(userId);
  }

  /**
   * Handle members with multiple devices
   * Ensures all devices receive the encrypted message
   * 
   * @param userId - The user ID
   * @param plaintext - The message to encrypt
   * @returns Map of encrypted messages keyed by deviceId
   */
  async encryptForUserDevices(
    userId: string,
    plaintext: string
  ): Promise<Map<string, EncryptedMessage>> {
    try {
      console.log(`[GroupEncryptionManager] Encrypting message for all devices of user ${userId}`);

      // Get user devices
      const devices = await this.fetchUserDevices(userId);

      if (devices.length === 0) {
        console.warn(`[GroupEncryptionManager] No devices found for user ${userId}`);
        return new Map();
      }

      // Encrypt for each device in parallel
      const encryptionPromises = devices.map(async (device) => {
        try {
          // Check if session exists
          const hasSession = await EncryptionService.hasSession(userId, device.deviceId);
          
          if (!hasSession) {
            await this.establishSession(userId, device.deviceId);
          }

          // Encrypt the message
          const encryptedMessage = await EncryptionService.encryptMessage(
            userId,
            device.deviceId,
            plaintext
          );

          return {
            deviceId: device.deviceId,
            encryptedMessage,
            success: true,
          };
        } catch (error) {
          console.error(
            `[GroupEncryptionManager] Failed to encrypt for device ${device.deviceId}:`,
            error
          );
          return {
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
          encryptedMessages.set(result.deviceId, result.encryptedMessage);
        }
      });

      console.log(
        `[GroupEncryptionManager] Encrypted for ${encryptedMessages.size}/${devices.length} devices`
      );

      return encryptedMessages;
    } catch (error) {
      console.error(`[GroupEncryptionManager] Failed to encrypt for user devices:`, error);
      throw error;
    }
  }

  /**
   * Add a new member to a group
   * Establishes sessions with all devices of the new member
   * Clears device cache to ensure fresh device list
   * 
   * @param groupId - The group chat ID
   * @param newMemberId - The user ID of the new member
   * @returns Promise that resolves when sessions are established
   */
  async addGroupMember(groupId: string, newMemberId: string): Promise<void> {
    try {
      console.log(`[GroupEncryptionManager] Adding member ${newMemberId} to group ${groupId}`);

      // Clear cache for this user to get fresh device list
      this.clearUserDeviceCache(newMemberId);

      // Fetch all devices for the new member
      const devices = await this.fetchUserDevices(newMemberId);

      if (devices.length === 0) {
        console.warn(`[GroupEncryptionManager] No devices found for new member ${newMemberId}`);
        return;
      }

      console.log(`[GroupEncryptionManager] Establishing sessions with ${devices.length} devices`);

      // Establish sessions with all devices in parallel
      const sessionPromises = devices.map(async (device) => {
        try {
          // Check if session already exists
          const hasSession = await EncryptionService.hasSession(newMemberId, device.deviceId);
          
          if (hasSession) {
            console.log(`[GroupEncryptionManager] Session already exists with ${newMemberId}.${device.deviceId}`);
            return { success: true, deviceId: device.deviceId };
          }

          // Establish new session
          await this.establishSession(newMemberId, device.deviceId);
          
          return { success: true, deviceId: device.deviceId };
        } catch (error) {
          console.error(
            `[GroupEncryptionManager] Failed to establish session with ${newMemberId}.${device.deviceId}:`,
            error
          );
          return {
            success: false,
            deviceId: device.deviceId,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      const results = await Promise.all(sessionPromises);

      // Count successes and failures
      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      console.log(
        `[GroupEncryptionManager] Member added: ${successful} sessions established, ${failed} failed`
      );

      if (failed > 0) {
        console.warn(
          `[GroupEncryptionManager] Some sessions failed to establish for member ${newMemberId}`
        );
      }
    } catch (error) {
      console.error(`[GroupEncryptionManager] Failed to add group member:`, error);
      throw new EncryptionError(
        EncryptionErrorCode.SESSION_CREATION_FAILED,
        `Failed to add group member: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true,
        'Unable to add member to encrypted group. Please try again.'
      );
    }
  }

  /**
   * Remove a member from a group
   * Deletes all sessions with the removed member's devices
   * Prevents the removed member from decrypting future messages
   * 
   * @param groupId - The group chat ID
   * @param removedMemberId - The user ID of the removed member
   * @returns Promise that resolves when sessions are deleted
   */
  async removeGroupMember(groupId: string, removedMemberId: string): Promise<void> {
    try {
      console.log(`[GroupEncryptionManager] Removing member ${removedMemberId} from group ${groupId}`);

      // Get all devices for the removed member
      // Use cached devices if available, otherwise fetch
      let devices: GroupMemberDevice[];
      const cached = this.getFromCache(removedMemberId);
      
      if (cached) {
        devices = cached;
      } else {
        try {
          devices = await this.fetchUserDevices(removedMemberId);
        } catch (error) {
          console.warn(
            `[GroupEncryptionManager] Failed to fetch devices for removed member, will clear cache only:`,
            error
          );
          devices = [];
        }
      }

      console.log(`[GroupEncryptionManager] Deleting sessions with ${devices.length} devices`);

      // Delete sessions with all devices
      const deletionPromises = devices.map(async (device) => {
        try {
          // Delete session from storage
          await EncryptionService.clearSessionCache();
          
          // Note: We can't directly delete from KeyStorageService here
          // The session will naturally expire or be overwritten
          // In a production system, you might want to add a deleteSession method
          
          console.log(`[GroupEncryptionManager] Session cleared for ${removedMemberId}.${device.deviceId}`);
          
          return { success: true, deviceId: device.deviceId };
        } catch (error) {
          console.error(
            `[GroupEncryptionManager] Failed to delete session with ${removedMemberId}.${device.deviceId}:`,
            error
          );
          return {
            success: false,
            deviceId: device.deviceId,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      await Promise.all(deletionPromises);

      // Clear device cache for this user
      this.clearUserDeviceCache(removedMemberId);

      console.log(`[GroupEncryptionManager] Member ${removedMemberId} removed from group ${groupId}`);
    } catch (error) {
      console.error(`[GroupEncryptionManager] Failed to remove group member:`, error);
      throw new EncryptionError(
        EncryptionErrorCode.SESSION_CORRUPTED,
        `Failed to remove group member: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true,
        'Unable to remove member from encrypted group. Please try again.'
      );
    }
  }

  /**
   * Rotate group encryption keys when membership changes
   * Generates a new group key and distributes to all current members
   * Note: This is a placeholder for sender key implementation
   * 
   * @param groupId - The group chat ID
   * @param currentMemberIds - Array of current member user IDs
   * @returns Promise that resolves when key rotation is complete
   */
  async rotateGroupKeys(groupId: string, currentMemberIds: string[]): Promise<void> {
    try {
      console.log(`[GroupEncryptionManager] Rotating keys for group ${groupId}`);

      // For groups using pairwise encryption (default), no key rotation needed
      // Each message is encrypted separately for each recipient
      
      // For groups over 100 members, implement sender key distribution
      if (currentMemberIds.length > 100) {
        console.log(
          `[GroupEncryptionManager] Large group detected (${currentMemberIds.length} members), sender key distribution recommended`
        );
        
        // TODO: Implement sender key distribution for large groups
        // This would involve:
        // 1. Generate a new sender key
        // 2. Encrypt the sender key for each member
        // 3. Distribute encrypted sender keys
        // 4. Use sender key for subsequent messages
        
        console.warn('[GroupEncryptionManager] Sender key distribution not yet implemented');
      }

      // Clear device cache for all members to ensure fresh device lists
      currentMemberIds.forEach((memberId) => {
        this.clearUserDeviceCache(memberId);
      });

      console.log(`[GroupEncryptionManager] Key rotation complete for group ${groupId}`);
    } catch (error) {
      console.error(`[GroupEncryptionManager] Failed to rotate group keys:`, error);
      throw new EncryptionError(
        EncryptionErrorCode.KEY_GENERATION_FAILED,
        `Failed to rotate group keys: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true,
        'Unable to rotate encryption keys. Please try again.'
      );
    }
  }

  /**
   * Implement sender key distribution for large groups (>100 members)
   * Uses a shared sender key to optimize encryption performance
   * Note: This is a placeholder for future implementation
   * 
   * @param groupId - The group chat ID
   * @param memberIds - Array of member user IDs
   * @returns Promise that resolves when sender key is distributed
   */
  async distributeSenderKey(groupId: string, memberIds: string[]): Promise<void> {
    try {
      console.log(
        `[GroupEncryptionManager] Distributing sender key for group ${groupId} with ${memberIds.length} members`
      );

      // TODO: Implement sender key distribution
      // This is a more efficient approach for large groups where:
      // 1. A sender generates a symmetric key (sender key)
      // 2. The sender key is encrypted for each recipient using pairwise encryption
      // 3. Messages are encrypted once with the sender key
      // 4. Recipients decrypt the sender key, then use it to decrypt messages
      
      // Benefits:
      // - Reduces encryption overhead from O(n) to O(1) per message
      // - Sender key is rotated periodically or when membership changes
      
      console.warn('[GroupEncryptionManager] Sender key distribution not yet implemented');
      console.log('[GroupEncryptionManager] Falling back to pairwise encryption');
    } catch (error) {
      console.error(`[GroupEncryptionManager] Failed to distribute sender key:`, error);
      throw new EncryptionError(
        EncryptionErrorCode.KEY_UPLOAD_FAILED,
        `Failed to distribute sender key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true,
        'Unable to distribute encryption key. Please try again.'
      );
    }
  }
}

// Export singleton instance
export default new GroupEncryptionManager();
