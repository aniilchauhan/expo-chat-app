/**
 * Basic tests for KeyStorageService
 * These tests verify core functionality of the key storage service
 */

import KeyStorageService from '../KeyStorageService';

describe('KeyStorageService', () => {
  beforeEach(async () => {
    // Clear storage before each test
    await KeyStorageService.clear();
  });

  afterAll(async () => {
    // Clean up after all tests
    await KeyStorageService.clear();
  });

  describe('Identity Key Pair', () => {
    it('should store and retrieve identity key pair', async () => {
      const keyPair = {
        publicKey: new Uint8Array([1, 2, 3, 4, 5]),
        privateKey: new Uint8Array([6, 7, 8, 9, 10]),
      };

      await KeyStorageService.storeIdentityKeyPair(keyPair);
      const retrieved = await KeyStorageService.getIdentityKeyPair();

      expect(retrieved).not.toBeNull();
      expect(retrieved?.publicKey).toEqual(keyPair.publicKey);
      expect(retrieved?.privateKey).toEqual(keyPair.privateKey);
    });

    it('should return null when no identity key pair exists', async () => {
      const retrieved = await KeyStorageService.getIdentityKeyPair();
      expect(retrieved).toBeNull();
    });
  });

  describe('Pre-Keys', () => {
    it('should store and retrieve pre-keys', async () => {
      const preKeys = [
        {
          keyId: 1,
          publicKey: new Uint8Array([1, 2, 3]),
          privateKey: new Uint8Array([4, 5, 6]),
        },
        {
          keyId: 2,
          publicKey: new Uint8Array([7, 8, 9]),
          privateKey: new Uint8Array([10, 11, 12]),
        },
      ];

      await KeyStorageService.storePreKeys(preKeys);
      const count = await KeyStorageService.getPreKeyCount();
      expect(count).toBe(2);

      const preKey1 = await KeyStorageService.getPreKey(1);
      expect(preKey1).not.toBeNull();
      expect(preKey1?.keyId).toBe(1);
    });

    it('should remove pre-key correctly', async () => {
      const preKeys = [
        {
          keyId: 1,
          publicKey: new Uint8Array([1, 2, 3]),
          privateKey: new Uint8Array([4, 5, 6]),
        },
      ];

      await KeyStorageService.storePreKeys(preKeys);
      await KeyStorageService.removePreKey(1);
      
      const retrieved = await KeyStorageService.getPreKey(1);
      expect(retrieved).toBeNull();
    });
  });

  describe('Sessions', () => {
    it('should store and retrieve session', async () => {
      const session = {
        recipientId: 'user123',
        deviceId: 'device456',
        sessionData: new Uint8Array([1, 2, 3, 4]),
        createdAt: new Date(),
        lastUsedAt: new Date(),
        messageCount: 5,
      };

      await KeyStorageService.storeSession(session.recipientId, session.deviceId, session);
      const retrieved = await KeyStorageService.getSession(session.recipientId, session.deviceId);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.recipientId).toBe(session.recipientId);
      expect(retrieved?.deviceId).toBe(session.deviceId);
      expect(retrieved?.messageCount).toBe(session.messageCount);
    });

    it('should delete session correctly', async () => {
      const session = {
        recipientId: 'user123',
        deviceId: 'device456',
        sessionData: new Uint8Array([1, 2, 3, 4]),
        createdAt: new Date(),
        lastUsedAt: new Date(),
        messageCount: 5,
      };

      await KeyStorageService.storeSession(session.recipientId, session.deviceId, session);
      await KeyStorageService.deleteSession(session.recipientId, session.deviceId);
      
      const retrieved = await KeyStorageService.getSession(session.recipientId, session.deviceId);
      expect(retrieved).toBeNull();
    });

    it('should get all sessions', async () => {
      const session1 = {
        recipientId: 'user1',
        deviceId: 'device1',
        sessionData: new Uint8Array([1, 2, 3]),
        createdAt: new Date(),
        lastUsedAt: new Date(),
        messageCount: 1,
      };

      const session2 = {
        recipientId: 'user2',
        deviceId: 'device2',
        sessionData: new Uint8Array([4, 5, 6]),
        createdAt: new Date(),
        lastUsedAt: new Date(),
        messageCount: 2,
      };

      await KeyStorageService.storeSession(session1.recipientId, session1.deviceId, session1);
      await KeyStorageService.storeSession(session2.recipientId, session2.deviceId, session2);

      const allSessions = await KeyStorageService.getAllSessions();
      expect(allSessions.size).toBe(2);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup old sessions', async () => {
      const oldSession = {
        recipientId: 'user1',
        deviceId: 'device1',
        sessionData: new Uint8Array([1, 2, 3]),
        createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
        lastUsedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        messageCount: 1,
      };

      const recentSession = {
        recipientId: 'user2',
        deviceId: 'device2',
        sessionData: new Uint8Array([4, 5, 6]),
        createdAt: new Date(),
        lastUsedAt: new Date(),
        messageCount: 2,
      };

      await KeyStorageService.storeSession(oldSession.recipientId, oldSession.deviceId, oldSession);
      await KeyStorageService.storeSession(recentSession.recipientId, recentSession.deviceId, recentSession);

      await KeyStorageService.cleanupOldSessions(30 * 24 * 60 * 60 * 1000); // 30 days

      const allSessions = await KeyStorageService.getAllSessions();
      expect(allSessions.size).toBe(1);
      expect(allSessions.has('user2_device2')).toBe(true);
    });
  });
});
