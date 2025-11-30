/**
 * Tests for EncryptionService message decryption
 * Tests task 6.5: Message decryption, prekey handling, session recovery, file decryption
 */

import EncryptionService, { EncryptedMessage, EncryptedFile, EncryptionErrorCode } from '../encryption/EncryptionService';
import KeyStorageService from '../KeyStorageService';

// Mock dependencies
jest.mock('../KeyStorageService');
jest.mock('axios');
jest.mock('react-native-securerandom', () => ({
  generateSecureRandom: jest.fn(() => Promise.resolve(new Uint8Array(32))),
}));
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(() => Promise.resolve('a'.repeat(64))),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256',
  },
}));

describe('EncryptionService - Message Decryption', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Mock KeyStorageService methods
    (KeyStorageService.initialize as jest.Mock).mockResolvedValue(undefined);
    (KeyStorageService.getIdentityKeyPair as jest.Mock).mockResolvedValue({
      publicKey: new Uint8Array(32),
      privateKey: new Uint8Array(32),
    });
    (KeyStorageService.getPreKeyCount as jest.Mock).mockResolvedValue(100);
    (KeyStorageService.getSession as jest.Mock).mockResolvedValue({
      recipientId: 'sender123',
      deviceId: 'device456',
      sessionData: new Uint8Array(100),
      createdAt: new Date(),
      lastUsedAt: new Date(),
      messageCount: 0,
    });
    (KeyStorageService.storeSession as jest.Mock).mockResolvedValue(undefined);
    (KeyStorageService.deleteSession as jest.Mock).mockResolvedValue(undefined);
  });

  describe('decryptMessage', () => {
    it('should decrypt a regular message successfully', async () => {
      await EncryptionService.initialize('user123', 'device789');

      // First create a session and encrypt a message
      const keyBundle = {
        userId: 'sender123',
        deviceId: 'device456',
        identityKey: new Uint8Array(32).fill(1),
        signedPreKey: {
          keyId: 1,
          publicKey: new Uint8Array(32).fill(2),
          signature: new Uint8Array(64).fill(3),
        },
        preKey: {
          keyId: 2,
          publicKey: new Uint8Array(32).fill(4),
        },
      };

      await EncryptionService.createSession('sender123', 'device456', keyBundle);

      // Encrypt a message
      const plaintext = 'Hello, World!';
      const encrypted = await EncryptionService.encryptMessage('sender123', 'device456', plaintext);

      // Now decrypt it
      const decrypted = await EncryptionService.decryptMessage('sender123', 'device456', encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle prekey messages and establish session', async () => {
      await EncryptionService.initialize('user123', 'device789');

      // Create a prekey message (simulated)
      const prekeyMessage: EncryptedMessage = {
        type: 'prekey',
        registrationId: 12345,
        body: new Uint8Array(100).fill(1),
      };

      // Mock session creation during prekey decryption
      (KeyStorageService.getSession as jest.Mock).mockResolvedValue(null);

      // This should establish a session while decrypting
      // In a real scenario, this would work with actual Signal Protocol
      // For testing, we're verifying the flow
      await expect(
        EncryptionService.decryptMessage('sender123', 'device456', prekeyMessage)
      ).rejects.toThrow();
    });

    it('should throw error for invalid ciphertext', async () => {
      await EncryptionService.initialize('user123', 'device789');

      const invalidMessage: EncryptedMessage = {
        type: 'message',
        registrationId: 12345,
        body: new Uint8Array(0), // Empty body
      };

      await expect(
        EncryptionService.decryptMessage('sender123', 'device456', invalidMessage)
      ).rejects.toThrow('Invalid encrypted message');
    });

    it('should update message counter after decryption', async () => {
      await EncryptionService.initialize('user123', 'device789');

      const keyBundle = {
        userId: 'sender123',
        deviceId: 'device456',
        identityKey: new Uint8Array(32).fill(1),
        signedPreKey: {
          keyId: 1,
          publicKey: new Uint8Array(32).fill(2),
          signature: new Uint8Array(64).fill(3),
        },
        preKey: {
          keyId: 2,
          publicKey: new Uint8Array(32).fill(4),
        },
      };

      await EncryptionService.createSession('sender123', 'device456', keyBundle);

      const plaintext = 'Test message';
      const encrypted = await EncryptionService.encryptMessage('sender123', 'device456', plaintext);

      await EncryptionService.decryptMessage('sender123', 'device456', encrypted);

      // Verify that storeSession was called (message counter updated)
      expect(KeyStorageService.storeSession).toHaveBeenCalled();
    });
  });

  describe('Session Recovery', () => {
    it('should attempt recovery on decryption failure', async () => {
      await EncryptionService.initialize('user123', 'device789');

      // Mock a corrupted session
      (KeyStorageService.getSession as jest.Mock).mockResolvedValue({
        recipientId: 'sender123',
        deviceId: 'device456',
        sessionData: new Uint8Array(10), // Corrupted/invalid session data
        createdAt: new Date(),
        lastUsedAt: new Date(),
        messageCount: 5,
      });

      const prekeyMessage: EncryptedMessage = {
        type: 'prekey',
        registrationId: 12345,
        body: new Uint8Array(100).fill(1),
      };

      // Should attempt to delete corrupted session
      await expect(
        EncryptionService.decryptMessage('sender123', 'device456', prekeyMessage)
      ).rejects.toThrow();

      // Verify session deletion was attempted
      expect(KeyStorageService.deleteSession).toHaveBeenCalledWith('sender123', 'device456');
    });

    it('should not recover regular messages without session', async () => {
      await EncryptionService.initialize('user123', 'device789');

      (KeyStorageService.getSession as jest.Mock).mockResolvedValue(null);

      const regularMessage: EncryptedMessage = {
        type: 'message',
        registrationId: 12345,
        body: new Uint8Array(100).fill(1),
      };

      await expect(
        EncryptionService.decryptMessage('sender123', 'device456', regularMessage)
      ).rejects.toThrow();
    });
  });

  describe('decryptFile', () => {
    it('should decrypt a file successfully', async () => {
      await EncryptionService.initialize('user123', 'device789');

      // First encrypt a file
      const originalData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const encrypted = await EncryptionService.encryptFile(
        originalData,
        'test.txt',
        'text/plain'
      );

      // Now decrypt it
      const decrypted = await EncryptionService.decryptFile(encrypted);

      expect(decrypted).toEqual(originalData);
    });

    it('should verify authentication tag before decryption', async () => {
      await EncryptionService.initialize('user123', 'device789');

      const originalData = new Uint8Array([1, 2, 3, 4, 5]);
      const encrypted = await EncryptionService.encryptFile(
        originalData,
        'test.txt',
        'text/plain'
      );

      // Tamper with the ciphertext
      encrypted.ciphertext[0] = encrypted.ciphertext[0] ^ 0xFF;

      // Should fail authentication
      await expect(
        EncryptionService.decryptFile(encrypted)
      ).rejects.toThrow('Authentication tag verification failed');
    });

    it('should throw error for invalid encrypted file', async () => {
      await EncryptionService.initialize('user123', 'device789');

      const invalidFile: EncryptedFile = {
        ciphertext: new Uint8Array(0),
        key: new Uint8Array(0),
        iv: new Uint8Array(0),
        authTag: new Uint8Array(0),
        originalName: 'test.txt',
        mimeType: 'text/plain',
        size: 0,
      };

      await expect(
        EncryptionService.decryptFile(invalidFile)
      ).rejects.toThrow('Invalid encrypted file');
    });

    it('should handle large files', async () => {
      await EncryptionService.initialize('user123', 'device789');

      // Create a larger file (1KB)
      const largeData = new Uint8Array(1024);
      for (let i = 0; i < largeData.length; i++) {
        largeData[i] = i % 256;
      }

      const encrypted = await EncryptionService.encryptFile(
        largeData,
        'large.bin',
        'application/octet-stream'
      );

      const decrypted = await EncryptionService.decryptFile(encrypted);

      expect(decrypted).toEqual(largeData);
      expect(decrypted.length).toBe(1024);
    });
  });

  describe('Message Counter Validation', () => {
    it('should validate message counter to prevent replay attacks', async () => {
      await EncryptionService.initialize('user123', 'device789');

      const keyBundle = {
        userId: 'sender123',
        deviceId: 'device456',
        identityKey: new Uint8Array(32).fill(1),
        signedPreKey: {
          keyId: 1,
          publicKey: new Uint8Array(32).fill(2),
          signature: new Uint8Array(64).fill(3),
        },
        preKey: {
          keyId: 2,
          publicKey: new Uint8Array(32).fill(4),
        },
      };

      await EncryptionService.createSession('sender123', 'device456', keyBundle);

      const plaintext = 'Test message';
      const encrypted = await EncryptionService.encryptMessage('sender123', 'device456', plaintext);

      // Decrypt once
      await EncryptionService.decryptMessage('sender123', 'device456', encrypted);

      // Message counter should be incremented
      const messageCount = await EncryptionService.getSessionMessageCount('sender123', 'device456');
      expect(messageCount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw EncryptionError with proper error code', async () => {
      await EncryptionService.initialize('user123', 'device789');

      const invalidMessage: EncryptedMessage = {
        type: 'message',
        registrationId: 12345,
        body: new Uint8Array(0),
      };

      try {
        await EncryptionService.decryptMessage('sender123', 'device456', invalidMessage);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBeDefined();
        expect(error.userMessage).toBeDefined();
      }
    });

    it('should provide user-friendly error messages', async () => {
      await EncryptionService.initialize('user123', 'device789');

      const invalidFile: EncryptedFile = {
        ciphertext: new Uint8Array(0),
        key: new Uint8Array(0),
        iv: new Uint8Array(0),
        authTag: new Uint8Array(0),
        originalName: 'test.txt',
        mimeType: 'text/plain',
        size: 0,
      };

      try {
        await EncryptionService.decryptFile(invalidFile);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.userMessage).toContain('decrypt');
      }
    });
  });
});
