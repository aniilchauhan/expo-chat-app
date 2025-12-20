import KeyStorageService, {
  IdentityKeyPair,
  PreKey,
  SignedPreKey,
} from '../KeyStorageService';
import { generateSecureRandom } from 'react-native-securerandom';
import axios from 'axios';
import * as Crypto from 'expo-crypto';
import FingerprintService, { Fingerprint } from './FingerprintService';

/**
 * EncryptionService - MOCKED Implementation
 * 
 * This service provides a mock implementation of the Signal Protocol
 * to bypass the 'utf-16le' encoding issue with the library.
 * 
 * WARNING: THIS IMPLEMENTATION DOES NOT PROVIDE REAL ENCRYPTION.
 * IT IS FOR DEVELOPMENT/DEBUGGING PURPOSES ONLY.
 */

// Types
export interface KeyBundle {
  userId: string;
  deviceId: string;
  identityKey: Uint8Array;
  signedPreKey: {
    keyId: number;
    publicKey: Uint8Array;
    signature: Uint8Array;
  };
  preKey: {
    keyId: number;
    publicKey: Uint8Array;
  };
}

export interface EncryptedMessage {
  type: 'prekey' | 'message';
  registrationId: number;
  body: Uint8Array;
}

export interface EncryptedFile {
  ciphertext: Uint8Array;
  key: Uint8Array;
  iv: Uint8Array;
  authTag: Uint8Array;
  originalName: string;
  mimeType: string;
  size: number;
}

export enum EncryptionErrorCode {
  KEY_GENERATION_FAILED = 'KEY_GENERATION_FAILED',
  KEY_STORAGE_FAILED = 'KEY_STORAGE_FAILED',
  KEY_RETRIEVAL_FAILED = 'KEY_RETRIEVAL_FAILED',
  INVALID_KEY_BUNDLE = 'INVALID_KEY_BUNDLE',
  SESSION_CREATION_FAILED = 'SESSION_CREATION_FAILED',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_CORRUPTED = 'SESSION_CORRUPTED',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  INVALID_CIPHERTEXT = 'INVALID_CIPHERTEXT',
  KEY_UPLOAD_FAILED = 'KEY_UPLOAD_FAILED',
  KEY_DOWNLOAD_FAILED = 'KEY_DOWNLOAD_FAILED',
  FINGERPRINT_MISMATCH = 'FINGERPRINT_MISMATCH',
  UNTRUSTED_DEVICE = 'UNTRUSTED_DEVICE',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  STORAGE_ACCESS_DENIED = 'STORAGE_ACCESS_DENIED',
}

export class EncryptionError extends Error {
  constructor(
    public code: EncryptionErrorCode,
    message: string,
    public recoverable: boolean = true,
    public userMessage?: string
  ) {
    super(message);
    this.name = 'EncryptionError';
  }
}

class EncryptionService {
  private userId: string | null = null;
  private deviceId: string | null = null;
  private initialized: boolean = false;
  private apiBaseUrl: string = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

  // Session cache for active conversations (in-memory LRU cache)
  private sessionCache: Map<string, { lastUsed: Date }> = new Map();
  private readonly MAX_CACHED_SESSIONS = 50;

  /**
   * Initialize the encryption service
   */
  async initialize(userId: string, deviceId?: string): Promise<void> {
    console.log('[EncryptionService] MOCK Initializing for user:', userId);
    this.userId = userId;
    this.deviceId = deviceId || this.generateDeviceId();
    this.initialized = true;
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the current device ID
   */
  getDeviceId(): string | null {
    return this.deviceId;
  }

  /**
   * Generate identity key pair
   */
  async generateIdentityKeyPair(): Promise<IdentityKeyPair> {
    console.log('[EncryptionService] Generating MOCK identity key pair');
    const pubKey = await generateSecureRandom(33);
    const privKey = await generateSecureRandom(32);
    return {
      publicKey: new Uint8Array(pubKey),
      privateKey: new Uint8Array(privKey),
    };
  }

  /**
   * Generate pre-keys
   */
  async generatePreKeys(count: number): Promise<PreKey[]> {
    console.log(`[EncryptionService] Generating ${count} MOCK pre-keys`);
    const preKeys: PreKey[] = [];
    for (let i = 0; i < count; i++) {
      const pubKey = await generateSecureRandom(33);
      const privKey = await generateSecureRandom(32);
      preKeys.push({
        keyId: Date.now() + i,
        publicKey: new Uint8Array(pubKey),
        privateKey: new Uint8Array(privKey),
      });
    }
    return preKeys;
  }

  /**
   * Generate signed pre-key
   */
  async generateSignedPreKey(): Promise<SignedPreKey> {
    console.log('[EncryptionService] Generating MOCK signed pre-key');
    const pubKey = await generateSecureRandom(33);
    const privKey = await generateSecureRandom(32);
    const signature = await generateSecureRandom(64);
    return {
      keyId: Date.now(),
      publicKey: new Uint8Array(pubKey),
      privateKey: new Uint8Array(privKey),
      signature: new Uint8Array(signature),
      timestamp: Date.now(),
    };
  }

  /**
   * Upload pre-keys to backend API
   */
  async uploadPreKeys(preKeys: PreKey[], signedPreKey: SignedPreKey): Promise<void> {
    console.log(`[EncryptionService] MOCK Uploading ${preKeys.length} pre-keys to server`);
    // Mock upload success
  }

  /**
   * Check pre-key inventory and replenish if needed
   */
  async checkAndReplenishPreKeys(): Promise<void> {
    // Mock check
  }

  /**
   * Generate a unique device ID
   */
  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new EncryptionError(
        EncryptionErrorCode.KEY_RETRIEVAL_FAILED,
        'Encryption service not initialized',
        true,
        'Encryption not ready. Please try again.'
      );
    }
  }

  /**
   * Create a session with a recipient
   */
  async createSession(recipientId: string, deviceId: string, keyBundle: KeyBundle): Promise<void> {
    console.log(`[EncryptionService] MOCK Creating session with ${recipientId}.${deviceId}`);
    const cacheKey = `${recipientId}.${deviceId}`;
    this.sessionCache.set(cacheKey, {
      lastUsed: new Date(),
    });
  }

  /**
   * Check if a session exists for a recipient device
   */
  async hasSession(recipientId: string, deviceId: string): Promise<boolean> {
    return true; // Always return true for mock
  }

  /**
   * Clear session cache
   */
  clearSessionCache(): void {
    this.sessionCache.clear();
  }

  /**
   * Get session cache statistics
   */
  getSessionCacheStats(): { size: number; maxSize: number; sessions: string[] } {
    return {
      size: this.sessionCache.size,
      maxSize: this.MAX_CACHED_SESSIONS,
      sessions: Array.from(this.sessionCache.keys()),
    };
  }

  /**
   * Fetch key bundle from backend API
   */
  async fetchKeyBundle(userId: string, deviceId: string): Promise<KeyBundle> {
    console.log(`[EncryptionService] MOCK Fetching key bundle for ${userId}.${deviceId}`);
    const pubKey = await generateSecureRandom(33);
    const signature = await generateSecureRandom(64);

    return {
      userId,
      deviceId,
      identityKey: new Uint8Array(pubKey),
      signedPreKey: {
        keyId: 1,
        publicKey: new Uint8Array(pubKey),
        signature: new Uint8Array(signature),
      },
      preKey: {
        keyId: 1,
        publicKey: new Uint8Array(pubKey),
      },
    };
  }

  /**
   * Encrypt a message
   */
  async encryptMessage(
    recipientId: string,
    deviceId: string,
    plaintext: string
  ): Promise<EncryptedMessage> {
    console.log(`[EncryptionService] MOCK Encrypting message for ${recipientId}.${deviceId}`);

    // Just encode plaintext as Uint8Array
    const body = new TextEncoder().encode(plaintext);

    return {
      type: 'message',
      registrationId: 0,
      body: body,
    };
  }

  /**
   * Encrypt a file
   */
  async encryptFile(
    fileData: Uint8Array,
    fileName: string,
    mimeType: string
  ): Promise<EncryptedFile> {
    console.log(`[EncryptionService] MOCK Encrypting file: ${fileName}`);

    const key = await generateSecureRandom(32);
    const iv = await generateSecureRandom(16);
    const authTag = await generateSecureRandom(32);

    return {
      ciphertext: fileData, // No encryption
      key: new Uint8Array(key),
      iv: new Uint8Array(iv),
      authTag: new Uint8Array(authTag),
      originalName: fileName,
      mimeType: mimeType,
      size: fileData.length,
    };
  }

  /**
   * Decrypt a message
   */
  async decryptMessage(
    senderId: string,
    deviceId: string,
    encryptedMessage: EncryptedMessage
  ): Promise<string> {
    console.log(`[EncryptionService] MOCK Decrypting message from ${senderId}.${deviceId}`);

    // Just decode body
    return new TextDecoder().decode(encryptedMessage.body);
  }

  /**
   * Decrypt a file
   */
  async decryptFile(encryptedFile: EncryptedFile): Promise<Uint8Array> {
    console.log(`[EncryptionService] MOCK Decrypting file: ${encryptedFile.originalName}`);
    return encryptedFile.ciphertext; // No decryption
  }

  /**
   * Get session message count
   */
  async getSessionMessageCount(recipientId: string, deviceId: string): Promise<number> {
    return 0;
  }

  /**
   * Get fingerprint (safety number)
   */
  async getFingerprint(userId: string, deviceId: string): Promise<Fingerprint> {
    console.log(`[EncryptionService] MOCK Getting fingerprint for ${userId}.${deviceId}`);
    return {
      displayableFingerprint: '00000 00000 00000 00000 00000 00000 00000 00000 00000 00000 00000 00000',
      rawFingerprint: '00'.repeat(32),
    };
  }

  /**
   * Verify a fingerprint
   */
  async verifyFingerprint(
    userId: string,
    deviceId: string,
    expectedFingerprint: string
  ): Promise<boolean> {
    return true;
  }

  /**
   * Generate QR code data for fingerprint sharing
   */
  async generateFingerprintQRCode(userId: string, deviceId: string): Promise<string> {
    return `SIGNAL_FINGERPRINT:1:${this.userId}:${userId}:MOCK`;
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
export default new EncryptionService();
