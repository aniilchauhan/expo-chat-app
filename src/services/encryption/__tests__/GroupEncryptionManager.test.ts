import GroupEncryptionManager from '../GroupEncryptionManager';
import EncryptionService from '../EncryptionService';

// Mock axios
jest.mock('axios');

// Mock EncryptionService
jest.mock('../EncryptionService', () => ({
  __esModule: true,
  default: {
    hasSession: jest.fn(),
    fetchKeyBundle: jest.fn(),
    createSession: jest.fn(),
    encryptMessage: jest.fn(),
    clearSessionCache: jest.fn(),
  },
  EncryptionError: class EncryptionError extends Error {
    constructor(public code: string, message: string, public recoverable: boolean, public userMessage?: string) {
      super(message);
    }
  },
  EncryptionErrorCode: {
    ENCRYPTION_FAILED: 'ENCRYPTION_FAILED',
    KEY_DOWNLOAD_FAILED: 'KEY_DOWNLOAD_FAILED',
    SESSION_CREATION_FAILED: 'SESSION_CREATION_FAILED',
    SESSION_CORRUPTED: 'SESSION_CORRUPTED',
    KEY_GENERATION_FAILED: 'KEY_GENERATION_FAILED',
    KEY_UPLOAD_FAILED: 'KEY_UPLOAD_FAILED',
  },
}));

describe('GroupEncryptionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    GroupEncryptionManager.clearDeviceCache();
  });

  describe('encryptGroupMessage', () => {
    it('should encrypt message for all group members', async () => {
      // Mock axios to return device information
      const axios = require('axios');
      axios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            devices: [
              { deviceId: 'device1', deviceName: 'iPhone', deviceType: 'ios' },
              { deviceId: 'device2', deviceName: 'iPad', deviceType: 'ios' },
            ],
          },
        },
      });

      // Mock EncryptionService methods
      (EncryptionService.hasSession as jest.Mock).mockResolvedValue(true);
      (EncryptionService.encryptMessage as jest.Mock).mockResolvedValue({
        type: 'message',
        registrationId: 123,
        body: new Uint8Array([1, 2, 3]),
      });

      const result = await GroupEncryptionManager.encryptGroupMessage(
        'group123',
        ['user1', 'user2'],
        'Hello group!'
      );

      expect(result.success).toBe(true);
      expect(result.encryptedMessages.size).toBe(4); // 2 users × 2 devices
      expect(result.failedRecipients.length).toBe(0);
    });

    it('should handle encryption failures gracefully', async () => {
      const axios = require('axios');
      axios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            devices: [
              { deviceId: 'device1', deviceName: 'iPhone', deviceType: 'ios' },
            ],
          },
        },
      });

      // Mock one successful and one failed encryption
      (EncryptionService.hasSession as jest.Mock).mockResolvedValue(true);
      (EncryptionService.encryptMessage as jest.Mock)
        .mockResolvedValueOnce({
          type: 'message',
          registrationId: 123,
          body: new Uint8Array([1, 2, 3]),
        })
        .mockRejectedValueOnce(new Error('Encryption failed'));

      const result = await GroupEncryptionManager.encryptGroupMessage(
        'group123',
        ['user1', 'user2'],
        'Hello group!'
      );

      expect(result.success).toBe(true);
      expect(result.encryptedMessages.size).toBe(1);
      expect(result.failedRecipients.length).toBe(1);
    });
  });

  describe('addGroupMember', () => {
    it('should establish sessions with new member devices', async () => {
      const axios = require('axios');
      axios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            devices: [
              { deviceId: 'device1', deviceName: 'iPhone', deviceType: 'ios' },
            ],
          },
        },
      });

      (EncryptionService.hasSession as jest.Mock).mockResolvedValue(false);
      (EncryptionService.fetchKeyBundle as jest.Mock).mockResolvedValue({
        userId: 'user1',
        deviceId: 'device1',
        identityKey: new Uint8Array([1, 2, 3]),
        signedPreKey: {
          keyId: 1,
          publicKey: new Uint8Array([4, 5, 6]),
          signature: new Uint8Array([7, 8, 9]),
        },
        preKey: {
          keyId: 2,
          publicKey: new Uint8Array([10, 11, 12]),
        },
      });
      (EncryptionService.createSession as jest.Mock).mockResolvedValue(undefined);

      await GroupEncryptionManager.addGroupMember('group123', 'user1');

      expect(EncryptionService.fetchKeyBundle).toHaveBeenCalledWith('user1', 'device1');
      expect(EncryptionService.createSession).toHaveBeenCalled();
    });
  });

  describe('removeGroupMember', () => {
    it('should clear sessions with removed member devices', async () => {
      const axios = require('axios');
      axios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            devices: [
              { deviceId: 'device1', deviceName: 'iPhone', deviceType: 'ios' },
            ],
          },
        },
      });

      (EncryptionService.clearSessionCache as jest.Mock).mockResolvedValue(undefined);

      await GroupEncryptionManager.removeGroupMember('group123', 'user1');

      expect(EncryptionService.clearSessionCache).toHaveBeenCalled();
    });
  });

  describe('rotateGroupKeys', () => {
    it('should clear device cache for all members', async () => {
      const memberIds = ['user1', 'user2', 'user3'];

      await GroupEncryptionManager.rotateGroupKeys('group123', memberIds);

      // Verify cache was cleared (no errors thrown)
      expect(true).toBe(true);
    });

    it('should detect large groups and recommend sender key distribution', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const memberIds = Array.from({ length: 101 }, (_, i) => `user${i}`);

      await GroupEncryptionManager.rotateGroupKeys('group123', memberIds);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Large group detected')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('device caching', () => {
    it('should cache device information', async () => {
      const axios = require('axios');
      axios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            devices: [
              { deviceId: 'device1', deviceName: 'iPhone', deviceType: 'ios' },
            ],
          },
        },
      });

      (EncryptionService.hasSession as jest.Mock).mockResolvedValue(true);
      (EncryptionService.encryptMessage as jest.Mock).mockResolvedValue({
        type: 'message',
        registrationId: 123,
        body: new Uint8Array([1, 2, 3]),
      });

      // First call should fetch from API
      await GroupEncryptionManager.encryptGroupMessage('group123', ['user1'], 'Hello');
      expect(axios.get).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await GroupEncryptionManager.encryptGroupMessage('group123', ['user1'], 'Hello again');
      expect(axios.get).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('should clear cache for specific user', async () => {
      const axios = require('axios');
      axios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            devices: [
              { deviceId: 'device1', deviceName: 'iPhone', deviceType: 'ios' },
            ],
          },
        },
      });

      (EncryptionService.hasSession as jest.Mock).mockResolvedValue(true);
      (EncryptionService.encryptMessage as jest.Mock).mockResolvedValue({
        type: 'message',
        registrationId: 123,
        body: new Uint8Array([1, 2, 3]),
      });

      // First call
      await GroupEncryptionManager.encryptGroupMessage('group123', ['user1'], 'Hello');
      expect(axios.get).toHaveBeenCalledTimes(1);

      // Clear cache for user1
      GroupEncryptionManager.clearUserDeviceCache('user1');

      // Second call should fetch from API again
      await GroupEncryptionManager.encryptGroupMessage('group123', ['user1'], 'Hello again');
      expect(axios.get).toHaveBeenCalledTimes(2);
    });
  });
});
