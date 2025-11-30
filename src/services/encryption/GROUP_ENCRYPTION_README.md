# Group Encryption Manager

## Overview

The `GroupEncryptionManager` provides end-to-end encryption for group chats by encrypting messages separately for each member device. It implements parallel encryption for performance optimization and handles multi-device support for group members.

## Features

- **Group Message Encryption**: Encrypts messages for all group members and their devices
- **Parallel Encryption**: Optimizes performance by encrypting for multiple recipients simultaneously
- **Device Discovery**: Automatically discovers and caches device information for group members
- **Multi-Device Support**: Handles members with multiple devices (phone, tablet, desktop)
- **Session Management**: Establishes and manages encryption sessions with all group member devices
- **Member Management**: Handles adding/removing members and key rotation
- **Sender Key Distribution**: Placeholder for efficient encryption in large groups (>100 members)

## Architecture

### Encryption Strategy

For groups, the manager uses **pairwise encryption** by default:
- Each message is encrypted separately for each recipient device
- Uses Signal Protocol's Double Ratchet for forward secrecy
- Provides strong security guarantees

For large groups (>100 members), **sender key distribution** is recommended:
- Sender generates a symmetric key (sender key)
- Sender key is encrypted for each recipient using pairwise encryption
- Messages are encrypted once with the sender key
- Reduces encryption overhead from O(n) to O(1) per message

## Usage

### Basic Group Message Encryption

```typescript
import GroupEncryptionManager from './services/encryption/GroupEncryptionManager';

// Encrypt a message for a group
const result = await GroupEncryptionManager.encryptGroupMessage(
  'group123',
  ['user1', 'user2', 'user3'],
  'Hello everyone!'
);

if (result.success) {
  console.log(`Encrypted for ${result.encryptedMessages.size} devices`);
  
  // Send encrypted messages to backend
  result.encryptedMessages.forEach((encryptedMsg, deviceKey) => {
    const [userId, deviceId] = deviceKey.split('.');
    // Send to backend API
  });
  
  // Handle failures
  if (result.failedRecipients.length > 0) {
    console.warn('Failed to encrypt for some recipients:', result.failedRecipients);
  }
}
```

### Adding a Member to a Group

```typescript
// Add a new member to an encrypted group
await GroupEncryptionManager.addGroupMember('group123', 'newUser');

// This will:
// 1. Fetch all devices for the new member
// 2. Establish encryption sessions with each device
// 3. Cache device information for future messages
```

### Removing a Member from a Group

```typescript
// Remove a member from an encrypted group
await GroupEncryptionManager.removeGroupMember('group123', 'removedUser');

// This will:
// 1. Clear all encryption sessions with the removed member's devices
// 2. Clear device cache for the removed member
// 3. Prevent the removed member from decrypting future messages
```

### Key Rotation

```typescript
// Rotate group keys when membership changes
await GroupEncryptionManager.rotateGroupKeys('group123', [
  'user1',
  'user2',
  'user3',
]);

// This will:
// 1. Clear device cache for all members
// 2. For large groups (>100 members), recommend sender key distribution
```

### Encrypting for a User's Multiple Devices

```typescript
// Encrypt a message for all devices of a specific user
const encryptedMessages = await GroupEncryptionManager.encryptForUserDevices(
  'user1',
  'Hello from all your devices!'
);

// Returns a Map<deviceId, EncryptedMessage>
encryptedMessages.forEach((encryptedMsg, deviceId) => {
  console.log(`Encrypted for device: ${deviceId}`);
});
```

## Device Caching

The manager implements device caching to reduce API calls:

- **Cache TTL**: 5 minutes
- **Cache Key**: User ID
- **Cache Invalidation**: Automatic on expiry or manual via `clearUserDeviceCache()`

```typescript
// Clear cache for a specific user
GroupEncryptionManager.clearUserDeviceCache('user1');

// Clear entire device cache
GroupEncryptionManager.clearDeviceCache();
```

## Error Handling

The manager handles various error scenarios:

```typescript
try {
  const result = await GroupEncryptionManager.encryptGroupMessage(
    'group123',
    memberIds,
    'Hello!'
  );
  
  // Check for partial failures
  if (result.failedRecipients.length > 0) {
    result.failedRecipients.forEach(failure => {
      console.error(
        `Failed to encrypt for ${failure.userId}.${failure.deviceId}: ${failure.error}`
      );
    });
  }
} catch (error) {
  if (error instanceof EncryptionError) {
    console.error(`Encryption error: ${error.userMessage}`);
  }
}
```

## Performance Considerations

### Small Groups (<10 members)

- Pairwise encryption is efficient
- Typical encryption time: <500ms
- Parallel encryption minimizes latency

### Medium Groups (10-100 members)

- Pairwise encryption still viable
- Device caching reduces overhead
- Consider batching for very active groups

### Large Groups (>100 members)

- Sender key distribution recommended
- Reduces encryption from O(n) to O(1)
- Requires key rotation on membership changes

## API Reference

### `encryptGroupMessage(groupId, memberIds, plaintext)`

Encrypts a message for all members in a group.

**Parameters:**
- `groupId` (string): The group chat ID
- `memberIds` (string[]): Array of user IDs in the group
- `plaintext` (string): The message content to encrypt

**Returns:** `Promise<GroupEncryptionResult>`

```typescript
interface GroupEncryptionResult {
  success: boolean;
  encryptedMessages: Map<string, EncryptedMessage>; // key: "userId.deviceId"
  failedRecipients: Array<{
    userId: string;
    deviceId: string;
    error: string;
  }>;
}
```

### `addGroupMember(groupId, newMemberId)`

Adds a new member to an encrypted group.

**Parameters:**
- `groupId` (string): The group chat ID
- `newMemberId` (string): The user ID of the new member

**Returns:** `Promise<void>`

### `removeGroupMember(groupId, removedMemberId)`

Removes a member from an encrypted group.

**Parameters:**
- `groupId` (string): The group chat ID
- `removedMemberId` (string): The user ID of the removed member

**Returns:** `Promise<void>`

### `rotateGroupKeys(groupId, currentMemberIds)`

Rotates group encryption keys when membership changes.

**Parameters:**
- `groupId` (string): The group chat ID
- `currentMemberIds` (string[]): Array of current member user IDs

**Returns:** `Promise<void>`

### `encryptForUserDevices(userId, plaintext)`

Encrypts a message for all devices of a specific user.

**Parameters:**
- `userId` (string): The user ID
- `plaintext` (string): The message to encrypt

**Returns:** `Promise<Map<string, EncryptedMessage>>`

### `clearDeviceCache()`

Clears the entire device cache.

**Returns:** `void`

### `clearUserDeviceCache(userId)`

Clears device cache for a specific user.

**Parameters:**
- `userId` (string): The user ID

**Returns:** `void`

## Backend Integration

The manager requires the following backend API endpoints:

### Get User Devices

```
GET /api/encryption/devices/:userId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "deviceId": "device123",
        "deviceName": "iPhone 13",
        "deviceType": "ios"
      }
    ]
  }
}
```

### Get Key Bundle

```
GET /api/encryption/keys/:userId/:deviceId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "deviceId": "device123",
    "identityKey": "base64...",
    "signedPreKey": {
      "keyId": 1,
      "publicKey": "base64...",
      "signature": "base64..."
    },
    "preKey": {
      "keyId": 2,
      "publicKey": "base64..."
    }
  }
}
```

## Security Considerations

### Forward Secrecy

- Each message uses a unique message key
- Compromise of current keys doesn't expose past messages
- Double Ratchet algorithm provides forward and backward secrecy

### Member Removal

- Removed members cannot decrypt future messages
- Sessions are cleared immediately
- Consider re-encrypting recent messages for added security

### Device Trust

- New devices must be verified by the user
- Unverified devices can still receive encrypted messages
- Implement device verification UI for enhanced security

### Large Group Security

- Sender key distribution trades some security for performance
- Sender key should be rotated regularly
- Consider limiting group size for maximum security

## Testing

Run the test suite:

```bash
npm test -- GroupEncryptionManager.test.ts
```

## Future Enhancements

1. **Sender Key Distribution**: Full implementation for large groups
2. **Web Worker Integration**: Offload encryption to background threads
3. **Batch Operations**: Optimize API calls for device discovery
4. **Key Rotation Policies**: Automatic rotation based on time/message count
5. **Device Verification**: UI for verifying group member devices
6. **Offline Support**: Queue messages when devices are offline

## Related Documentation

- [EncryptionService](./README.md) - Core encryption service
- [KeyStorageService](../KeyStorageService.ts) - Secure key storage
- [Signal Protocol](https://signal.org/docs/) - Encryption protocol specification
