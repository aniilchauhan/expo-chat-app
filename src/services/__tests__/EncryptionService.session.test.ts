/**
 * Tests for EncryptionService session management
 * Tests task 6.3: Session creation, checking, and caching
 */

import EncryptionService from '../encryption/EncryptionService';
import KeyStorageService from '../KeyStorageService';

// Mock dependencies
jest.mock('../KeyStorageService');
jest.mock('axios');
jest.mock('react-native-securerandom', () => ({
  generateSecureRandom: jest.fn(() => Promise.resolve(new Uint8Array(32))),
}));

describe('EncryptionService - Session Management', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Mock KeyStorageService methods
    (KeyStorageService.initialize as jest.Mock).mockResolvedValue(undefined);
    (KeyStorageService.getIdentityKeyPair as jest.Mock).mockResolvedValue({
      publicKey: new Uint8Array(32),
      privateKey: new Uint8Array(32),
    });
    (KeyStorageService.getPreKeyCount as jest.Mock).mockResolvedValue(100);
    (KeyStorageService.getSession as jest.Mock).mockResolvedValue(null);
    (KeyStorageService.storeSession as jest.Mock).mockResolvedValue(undefined);
  });

  describe('createSession', () => {
    it('should create a session with valid key bundle', async () => {
      await EncryptionService.initialize('user123', 'device456');

      const keyBundle = {
        userId: 'recipient789',
        deviceId: 'device999',
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

      await expect(
        EncryptionService.createSession('recipient789', 'device999', keyBundle)
      ).resolves.not.toThrow();
    });

    it('should throw error for invalid key bundle', async () => {
      await EncryptionService.initialize('user123', 'device456');

      const invalidKeyBundle = {
        userId: 'recipient789',
        deviceId: 'device999',
        identityKey: new Uint8Array(32),
        signedPreKey: null as any,
        preKey: null as any,
      };

      await expect(
        EncryptionService.createSession('recipient789', 'device999', invalidKeyBundle)
      ).rejects.toThrow('Invalid key bundle');
    });

    it('should cache created sessions', async () => {
      await EncryptionService.initialize('user123', 'device456');

      const keyBundle = {
        userId: 'recipient789',
        deviceId: 'device999',
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

      await EncryptionService.createSession('recipient789', 'device999', keyBundle);

      const stats = EncryptionService.getSessionCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.sessions).toContain('recipient789.device999');
    });
  });

  describe('hasSession', () => {
    it('should return true for cached session', async () => {
      await EncryptionService.initialize('user123', 'device456');

      const keyBundle = {
        userId: 'recipient789',
        deviceId: 'device999',
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

      await EncryptionService.createSession('recipient789', 'device999', keyBundle);

      const hasSession = await EncryptionService.hasSession('recipient789', 'device999');
      expect(hasSession).toBe(true);
    });

    it('should return true for session in storage', async () => {
      await EncryptionService.initialize('user123', 'device456');

      (KeyStorageService.getSession as jest.Mock).mockResolvedValue({
        recipientId: 'recipient789',
        deviceId: 'device999',
        sessionData: new Uint8Array(100),
        createdAt: new Date(),
        lastUsedAt: new Date(),
        messageCount: 5,
      });

      const hasSession = await EncryptionService.hasSession('recipient789', 'device999');
      expect(hasSession).toBe(true);
    });

    it('should return false for non-existent session', async () => {
      await EncryptionService.initialize('user123', 'device456');

      const hasSession = await EncryptionService.hasSession('nonexistent', 'device000');
      expect(hasSession).toBe(false);
    });
  });

  describe('Session Cache Management', () => {
    it('should evict old sessions when cache is full', async () => {
      await EncryptionService.initialize('user123', 'device456');

      // Create more sessions than the cache limit (50)
      for (let i = 0; i < 55; i++) {
        const keyBundle = {
          userId: `recipient${i}`,
          deviceId: `device${i}`,
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

        await EncryptionService.createSession(`recipient${i}`, `device${i}`, keyBundle);
      }

      const stats = EncryptionService.getSessionCacheStats();
      expect(stats.size).toBeLessThanOrEqual(stats.maxSize);
    });

    it('should clear session cache', async () => {
      await EncryptionService.initialize('user123', 'device456');

      const keyBundle = {
        userId: 'recipient789',
        deviceId: 'device999',
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

      await EncryptionService.createSession('recipient789', 'device999', keyBundle);

      let stats = EncryptionService.getSessionCacheStats();
      expect(stats.size).toBe(1);

      EncryptionService.clearSessionCache();

      stats = EncryptionService.getSessionCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should provide cache statistics', async () => {
      await EncryptionService.initialize('user123', 'device456');

      const stats = EncryptionService.getSessionCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('sessions');
      expect(Array.isArray(stats.sessions)).toBe(true);
    });
  });
});
