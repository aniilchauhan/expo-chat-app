# Encryption Services

This directory contains encryption-related services for the mobile app.

## KeyStorageService

The `KeyStorageService` provides secure storage for encryption keys and session data using platform-specific secure storage mechanisms.

### Features

- **Identity Key Pair Storage**: Stores long-term identity keys in iOS Keychain/Android Keystore
- **Pre-Key Management**: Manages one-time pre-keys with encrypted AsyncStorage
- **Session State Storage**: Stores Signal Protocol session state securely
- **Automatic Cleanup**: Removes old sessions to manage storage quota
- **Migration Support**: Handles storage schema updates

### Security

- Identity keys are stored in platform secure storage (Keychain/Keystore) with `WHEN_UNLOCKED_THIS_DEVICE_ONLY` accessibility
- Pre-keys and sessions are encrypted using XOR encryption with a secure random key
- The encryption key itself is stored in Keychain/Keystore
- All sensitive data is cleared on logout

### Usage

```typescript
import KeyStorageService from '@/services/KeyStorageService';

// Initialize the service
await KeyStorageService.initialize();

// Store identity key pair
const keyPair = {
  publicKey: new Uint8Array([...]),
  privateKey: new Uint8Array([...]),
};
await KeyStorageService.storeIdentityKeyPair(keyPair);

// Retrieve identity key pair
const retrieved = await KeyStorageService.getIdentityKeyPair();

// Store pre-keys
const preKeys = [
  { keyId: 1, publicKey: new Uint8Array([...]), privateKey: new Uint8Array([...]) },
  { keyId: 2, publicKey: new Uint8Array([...]), privateKey: new Uint8Array([...]) },
];
await KeyStorageService.storePreKeys(preKeys);

// Get pre-key count
const count = await KeyStorageService.getPreKeyCount();

// Store session
const session = {
  recipientId: 'user123',
  deviceId: 'device456',
  sessionData: new Uint8Array([...]),
  createdAt: new Date(),
  lastUsedAt: new Date(),
  messageCount: 5,
};
await KeyStorageService.storeSession(session.recipientId, session.deviceId, session);

// Get session
const retrievedSession = await KeyStorageService.getSession('user123', 'device456');

// Cleanup old sessions (older than 30 days)
await KeyStorageService.cleanupOldSessions(30 * 24 * 60 * 60 * 1000);

// Clear all encryption data
await KeyStorageService.clear();
```

### Error Handling

The service throws specific error codes for different failure scenarios:

- `KEY_STORAGE_INITIALIZATION_FAILED`: Failed to initialize the service
- `KEY_STORAGE_FAILED`: Failed to store data
- `KEY_RETRIEVAL_FAILED`: Failed to retrieve data
- `STORAGE_CLEAR_FAILED`: Failed to clear storage
- `STORAGE_CLEANUP_FAILED`: Failed to cleanup old sessions
- `STORAGE_MIGRATION_FAILED`: Failed to migrate storage schema

### Testing

Run tests with:

```bash
npm test -- KeyStorageService.test.ts
```

### Future Improvements

- Replace XOR encryption with AES-GCM for AsyncStorage data
- Add support for hardware-backed encryption on supported devices
- Implement automatic key rotation
- Add telemetry for storage usage and performance
