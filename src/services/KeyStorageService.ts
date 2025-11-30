import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateSecureRandom } from 'react-native-securerandom';

/**
 * KeyStorageService - Secure storage for encryption keys and session data
 * 
 * This service provides secure storage for:
 * - Identity key pairs (stored in Keychain)
 * - Pre-keys (stored in encrypted AsyncStorage)
 * - Session state (stored in AsyncStorage)
 */

// Storage keys
const STORAGE_KEYS = {
  IDENTITY_KEY_PAIR: 'encryption_identity_key_pair',
  PRE_KEYS: 'encryption_pre_keys',
  PRE_KEY_PREFIX: 'encryption_pre_key_',
  SESSIONS: 'encryption_sessions',
  SESSION_PREFIX: 'encryption_session_',
  ENCRYPTION_KEY: 'encryption_storage_key',
};

// Types
export interface IdentityKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface PreKey {
  keyId: number;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface SignedPreKey extends PreKey {
  signature: Uint8Array;
  timestamp: number;
}

export interface SessionState {
  recipientId: string;
  deviceId: string;
  sessionData: Uint8Array;
  createdAt: Date;
  lastUsedAt: Date;
  messageCount: number;
}

class KeyStorageService {
  private encryptionKey: Uint8Array | null = null;

  /**
   * Initialize the service and generate encryption key for AsyncStorage
   */
  async initialize(): Promise<void> {
    try {
      // Try to retrieve existing encryption key from Keychain
      const credentials = await Keychain.getGenericPassword({
        service: STORAGE_KEYS.ENCRYPTION_KEY,
      });

      if (credentials && credentials.password) {
        // Convert base64 back to Uint8Array
        this.encryptionKey = this.base64ToUint8Array(credentials.password);
      } else {
        // Generate new encryption key for AsyncStorage encryption
        const randomBytes = await generateSecureRandom(32);
        this.encryptionKey = new Uint8Array(randomBytes);
        
        // Store in Keychain
        await Keychain.setGenericPassword(
          'encryption_key',
          this.uint8ArrayToBase64(this.encryptionKey),
          {
            service: STORAGE_KEYS.ENCRYPTION_KEY,
            accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          }
        );
      }
    } catch (error) {
      console.error('Failed to initialize KeyStorageService:', error);
      throw new Error('KEY_STORAGE_INITIALIZATION_FAILED');
    }
  }

  // ==================== Identity Key Pair Methods ====================

  /**
   * Store identity key pair securely in Keychain
   */
  async storeIdentityKeyPair(keyPair: IdentityKeyPair): Promise<void> {
    try {
      const serialized = JSON.stringify({
        publicKey: this.uint8ArrayToBase64(keyPair.publicKey),
        privateKey: this.uint8ArrayToBase64(keyPair.privateKey),
      });

      await Keychain.setGenericPassword(
        'identity_key_pair',
        serialized,
        {
          service: STORAGE_KEYS.IDENTITY_KEY_PAIR,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }
      );
    } catch (error) {
      console.error('Failed to store identity key pair:', error);
      throw new Error('KEY_STORAGE_FAILED');
    }
  }

  /**
   * Retrieve identity key pair from Keychain
   */
  async getIdentityKeyPair(): Promise<IdentityKeyPair | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: STORAGE_KEYS.IDENTITY_KEY_PAIR,
      });

      if (!credentials || !credentials.password) {
        return null;
      }

      const parsed = JSON.parse(credentials.password);
      return {
        publicKey: this.base64ToUint8Array(parsed.publicKey),
        privateKey: this.base64ToUint8Array(parsed.privateKey),
      };
    } catch (error) {
      console.error('Failed to retrieve identity key pair:', error);
      throw new Error('KEY_RETRIEVAL_FAILED');
    }
  }

  // ==================== Pre-Key Methods ====================

  /**
   * Store pre-keys array to AsyncStorage with encryption
   */
  async storePreKeys(preKeys: PreKey[]): Promise<void> {
    try {
      if (!this.encryptionKey) {
        await this.initialize();
      }

      // Serialize pre-keys
      const serialized = preKeys.map(pk => ({
        keyId: pk.keyId,
        publicKey: this.uint8ArrayToBase64(pk.publicKey),
        privateKey: this.uint8ArrayToBase64(pk.privateKey),
      }));

      // Encrypt and store
      const encrypted = await this.encryptData(JSON.stringify(serialized));
      await AsyncStorage.setItem(STORAGE_KEYS.PRE_KEYS, encrypted);

      // Also store individual pre-keys for quick access
      for (const preKey of preKeys) {
        const key = `${STORAGE_KEYS.PRE_KEY_PREFIX}${preKey.keyId}`;
        const serializedPreKey = JSON.stringify({
          keyId: preKey.keyId,
          publicKey: this.uint8ArrayToBase64(preKey.publicKey),
          privateKey: this.uint8ArrayToBase64(preKey.privateKey),
        });
        const encryptedPreKey = await this.encryptData(serializedPreKey);
        await AsyncStorage.setItem(key, encryptedPreKey);
      }
    } catch (error) {
      console.error('Failed to store pre-keys:', error);
      throw new Error('KEY_STORAGE_FAILED');
    }
  }

  /**
   * Get a specific pre-key by ID
   */
  async getPreKey(keyId: number): Promise<PreKey | null> {
    try {
      if (!this.encryptionKey) {
        await this.initialize();
      }

      const key = `${STORAGE_KEYS.PRE_KEY_PREFIX}${keyId}`;
      const encrypted = await AsyncStorage.getItem(key);

      if (!encrypted) {
        return null;
      }

      const decrypted = await this.decryptData(encrypted);
      const parsed = JSON.parse(decrypted);

      return {
        keyId: parsed.keyId,
        publicKey: this.base64ToUint8Array(parsed.publicKey),
        privateKey: this.base64ToUint8Array(parsed.privateKey),
      };
    } catch (error) {
      console.error('Failed to retrieve pre-key:', error);
      throw new Error('KEY_RETRIEVAL_FAILED');
    }
  }

  /**
   * Remove a pre-key from storage
   */
  async removePreKey(keyId: number): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.PRE_KEY_PREFIX}${keyId}`;
      await AsyncStorage.removeItem(key);

      // Also update the main pre-keys array
      if (!this.encryptionKey) {
        await this.initialize();
      }

      const encrypted = await AsyncStorage.getItem(STORAGE_KEYS.PRE_KEYS);
      if (encrypted) {
        const decrypted = await this.decryptData(encrypted);
        const preKeys = JSON.parse(decrypted);
        const filtered = preKeys.filter((pk: any) => pk.keyId !== keyId);
        const encryptedFiltered = await this.encryptData(JSON.stringify(filtered));
        await AsyncStorage.setItem(STORAGE_KEYS.PRE_KEYS, encryptedFiltered);
      }
    } catch (error) {
      console.error('Failed to remove pre-key:', error);
      throw new Error('KEY_STORAGE_FAILED');
    }
  }

  /**
   * Get the count of available pre-keys
   */
  async getPreKeyCount(): Promise<number> {
    try {
      if (!this.encryptionKey) {
        await this.initialize();
      }

      const encrypted = await AsyncStorage.getItem(STORAGE_KEYS.PRE_KEYS);
      if (!encrypted) {
        return 0;
      }

      const decrypted = await this.decryptData(encrypted);
      const preKeys = JSON.parse(decrypted);
      return preKeys.length;
    } catch (error) {
      console.error('Failed to get pre-key count:', error);
      return 0;
    }
  }

  // ==================== Session Storage Methods ====================

  /**
   * Store session state to AsyncStorage
   */
  async storeSession(recipientId: string, deviceId: string, session: SessionState): Promise<void> {
    try {
      if (!this.encryptionKey) {
        await this.initialize();
      }

      const key = `${STORAGE_KEYS.SESSION_PREFIX}${recipientId}_${deviceId}`;
      const serialized = JSON.stringify({
        recipientId: session.recipientId,
        deviceId: session.deviceId,
        sessionData: this.uint8ArrayToBase64(session.sessionData),
        createdAt: session.createdAt.toISOString(),
        lastUsedAt: session.lastUsedAt.toISOString(),
        messageCount: session.messageCount,
      });

      const encrypted = await this.encryptData(serialized);
      await AsyncStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('Failed to store session:', error);
      throw new Error('KEY_STORAGE_FAILED');
    }
  }

  /**
   * Retrieve session state by recipientId and deviceId
   */
  async getSession(recipientId: string, deviceId: string): Promise<SessionState | null> {
    try {
      if (!this.encryptionKey) {
        await this.initialize();
      }

      const key = `${STORAGE_KEYS.SESSION_PREFIX}${recipientId}_${deviceId}`;
      const encrypted = await AsyncStorage.getItem(key);

      if (!encrypted) {
        return null;
      }

      const decrypted = await this.decryptData(encrypted);
      const parsed = JSON.parse(decrypted);

      return {
        recipientId: parsed.recipientId,
        deviceId: parsed.deviceId,
        sessionData: this.base64ToUint8Array(parsed.sessionData),
        createdAt: new Date(parsed.createdAt),
        lastUsedAt: new Date(parsed.lastUsedAt),
        messageCount: parsed.messageCount,
      };
    } catch (error) {
      console.error('Failed to retrieve session:', error);
      throw new Error('KEY_RETRIEVAL_FAILED');
    }
  }

  /**
   * Delete a session from storage
   */
  async deleteSession(recipientId: string, deviceId: string): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.SESSION_PREFIX}${recipientId}_${deviceId}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw new Error('KEY_STORAGE_FAILED');
    }
  }

  /**
   * Get all active sessions
   */
  async getAllSessions(): Promise<Map<string, SessionState>> {
    try {
      if (!this.encryptionKey) {
        await this.initialize();
      }

      const sessions = new Map<string, SessionState>();
      const allKeys = await AsyncStorage.getAllKeys();
      const sessionKeys = allKeys.filter(key => key.startsWith(STORAGE_KEYS.SESSION_PREFIX));

      for (const key of sessionKeys) {
        const encrypted = await AsyncStorage.getItem(key);
        if (encrypted) {
          const decrypted = await this.decryptData(encrypted);
          const parsed = JSON.parse(decrypted);
          const sessionState: SessionState = {
            recipientId: parsed.recipientId,
            deviceId: parsed.deviceId,
            sessionData: this.base64ToUint8Array(parsed.sessionData),
            createdAt: new Date(parsed.createdAt),
            lastUsedAt: new Date(parsed.lastUsedAt),
            messageCount: parsed.messageCount,
          };
          sessions.set(`${parsed.recipientId}_${parsed.deviceId}`, sessionState);
        }
      }

      return sessions;
    } catch (error) {
      console.error('Failed to get all sessions:', error);
      throw new Error('KEY_RETRIEVAL_FAILED');
    }
  }

  // ==================== Secure Storage Utilities ====================

  /**
   * Securely wipe all encryption data from storage
   */
  async clear(): Promise<void> {
    try {
      // Clear identity key pair from Keychain
      await Keychain.resetGenericPassword({
        service: STORAGE_KEYS.IDENTITY_KEY_PAIR,
      });

      // Clear encryption key from Keychain
      await Keychain.resetGenericPassword({
        service: STORAGE_KEYS.ENCRYPTION_KEY,
      });

      // Clear all pre-keys and sessions from AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      const encryptionKeys = allKeys.filter(
        key =>
          key.startsWith(STORAGE_KEYS.PRE_KEY_PREFIX) ||
          key.startsWith(STORAGE_KEYS.SESSION_PREFIX) ||
          key === STORAGE_KEYS.PRE_KEYS ||
          key === STORAGE_KEYS.SESSIONS
      );

      await AsyncStorage.multiRemove(encryptionKeys);

      // Clear in-memory encryption key
      this.encryptionKey = null;
    } catch (error) {
      console.error('Failed to clear encryption data:', error);
      throw new Error('STORAGE_CLEAR_FAILED');
    }
  }

  /**
   * Check storage quota and cleanup old sessions
   */
  async cleanupOldSessions(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const sessions = await this.getAllSessions();
      const now = Date.now();

      for (const [key, session] of sessions.entries()) {
        const age = now - session.lastUsedAt.getTime();
        if (age > maxAge) {
          await this.deleteSession(session.recipientId, session.deviceId);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old sessions:', error);
      throw new Error('STORAGE_CLEANUP_FAILED');
    }
  }

  /**
   * Handle storage access failures with retry logic
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries - 1) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
        }
      }
    }

    throw lastError || new Error('STORAGE_ACCESS_FAILED');
  }

  /**
   * Migration helper for storage schema updates
   */
  async migrateStorage(fromVersion: number, toVersion: number): Promise<void> {
    try {
      console.log(`Migrating storage from version ${fromVersion} to ${toVersion}`);

      // Add migration logic here as schema evolves
      // For now, this is a placeholder

      if (fromVersion < 2 && toVersion >= 2) {
        // Example: Migration from v1 to v2
        // Add any necessary data transformations
      }

      console.log('Storage migration completed successfully');
    } catch (error) {
      console.error('Storage migration failed:', error);
      throw new Error('STORAGE_MIGRATION_FAILED');
    }
  }

  // ==================== Helper Methods ====================

  /**
   * Simple XOR encryption for AsyncStorage data
   * Note: This is a basic implementation. For production, consider using a proper encryption library
   */
  private async encryptData(data: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const dataBytes = new TextEncoder().encode(data);
    const encrypted = new Uint8Array(dataBytes.length);

    for (let i = 0; i < dataBytes.length; i++) {
      encrypted[i] = dataBytes[i] ^ this.encryptionKey[i % this.encryptionKey.length];
    }

    return this.uint8ArrayToBase64(encrypted);
  }

  /**
   * Simple XOR decryption for AsyncStorage data
   */
  private async decryptData(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const encrypted = this.base64ToUint8Array(encryptedData);
    const decrypted = new Uint8Array(encrypted.length);

    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ this.encryptionKey[i % this.encryptionKey.length];
    }

    return new TextDecoder().decode(decrypted);
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
export default new KeyStorageService();
