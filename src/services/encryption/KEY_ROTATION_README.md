# Key Rotation Service

## Overview

The KeyRotationService implements automatic key rotation and forward secrecy for the end-to-end encryption system. It ensures that encryption keys are regularly rotated to maintain security and prevent compromise of past messages.

## Features

### 1. Session Key Rotation

- **Automatic rotation** based on message count (1000 messages) or time elapsed (7 days)
- **Double Ratchet algorithm** ensures forward secrecy
- **Secure deletion** of old session keys after rotation
- **Background job** checks sessions periodically and rotates when needed

### 2. Signed Pre-Key Rotation

- **Weekly rotation schedule** for signed pre-keys
- **Automatic generation** of new pre-keys during rotation
- **Background job** checks daily and rotates if needed
- **Cleanup logic** removes old signed pre-keys after rotation

### 3. Monitoring and Alerting

- **Rotation events logging** for all rotation activities
- **Metrics tracking** for rotation frequency and success rate
- **Failure detection** with automatic retry logic (exponential backoff)
- **Alert system** for critical rotation failures
- **Health status monitoring** with detailed reports

## Usage

### Initialize and Start Automatic Rotation

```typescript
import KeyRotationService from './services/encryption/KeyRotationService';

// Start automatic session key rotation (checks every hour)
KeyRotationService.startAutomaticRotation();

// Start signed pre-key rotation schedule (checks daily)
KeyRotationService.startSignedPreKeyRotationSchedule();
```

### Manual Rotation

```typescript
// Manually rotate a session key
const success = await KeyRotationService.rotateSessionKey(
  recipientId,
  deviceId,
  'manual'
);

// Manually rotate signed pre-key
const success = await KeyRotationService.rotateSignedPreKey();
```

### Check if Rotation is Needed

```typescript
// Check if session key rotation is needed
const { needed, reason } = await KeyRotationService.checkRotationNeeded(
  recipientId,
  deviceId
);

if (needed) {
  console.log(`Rotation needed due to: ${reason}`);
}

// Check if signed pre-key rotation is needed
const needed = KeyRotationService.checkSignedPreKeyRotationNeeded();
```

### Rotation with Retry Logic

```typescript
// Rotate with automatic retry (up to 3 attempts with exponential backoff)
const success = await KeyRotationService.rotateSessionKeyWithRetry(
  recipientId,
  deviceId,
  'messageCount',
  3 // max retries
);

// Rotate signed pre-key with retry
const success = await KeyRotationService.rotateSignedPreKeyWithRetry(3);
```

### Monitoring and Metrics

```typescript
// Get rotation metrics
const metrics = KeyRotationService.getRotationMetrics();
console.log('Total rotations:', metrics.totalRotations);
console.log('Success rate:', KeyRotationService.getRotationSuccessRate());
console.log('Failure rate:', KeyRotationService.getRotationFailureRate());

// Get rotation events
const events = KeyRotationService.getRotationEvents(50);
events.forEach(event => {
  console.log(`${event.type} at ${event.timestamp}`);
});

// Get health status
const health = KeyRotationService.getRotationHealthStatus();
console.log('Status:', health.status); // 'healthy', 'warning', or 'critical'
console.log('Issues:', health.issues);

// Generate monitoring report
const report = KeyRotationService.generateMonitoringReport();
console.log('Report:', JSON.stringify(report, null, 2));
```

## Rotation Thresholds

### Session Key Rotation

- **Message Count**: 1000 messages
- **Time Elapsed**: 7 days (604,800,000 milliseconds)

### Signed Pre-Key Rotation

- **Schedule**: Weekly (7 days)
- **Check Frequency**: Daily

### Background Jobs

- **Session Check Interval**: Every hour (3,600,000 milliseconds)
- **Signed Pre-Key Check**: Daily (86,400,000 milliseconds)

## Rotation Process

### Session Key Rotation

1. Check if rotation is needed (message count or time elapsed)
2. Get current session for metrics
3. Securely delete old session (overwrite with random data)
4. Fetch new key bundle from server
5. Create new session with fresh keys (Double Ratchet)
6. Log rotation event and update metrics

### Signed Pre-Key Rotation

1. Check if a week has passed since last rotation
2. Generate new signed pre-key
3. Generate 50 new pre-keys
4. Upload to server
5. Update last rotation timestamp
6. Log rotation event

## Security Features

### Forward Secrecy

The Double Ratchet algorithm ensures that:
- Compromise of current keys does not expose past messages
- Each message uses a unique message key
- Chain keys are ratcheted forward with each message
- Old keys are securely deleted after use

### Secure Deletion

Before deleting session keys:
1. Session data is overwritten with random bytes
2. Session is stored with random data
3. Session is then deleted from storage
4. This prevents potential recovery of old keys

## Monitoring and Alerting

### Rotation Events

All rotation activities are logged as events:
- `SESSION_KEY_ROTATED`: Session key successfully rotated
- `SIGNED_PREKEY_ROTATED`: Signed pre-key successfully rotated
- `ROTATION_CHECK_PERFORMED`: Periodic check completed
- `ROTATION_FAILED`: Rotation failed after retries

### Metrics Tracked

- Total rotations
- Successful rotations
- Failed rotations
- Last rotation timestamp
- Average rotation interval
- Rotations by reason (message count, time elapsed, manual)

### Health Status

The service provides health status assessment:
- **Healthy**: Success rate > 80%, recent rotations
- **Warning**: Success rate 50-80%, or no rotations in 14+ days
- **Critical**: Success rate < 50%

### Alerts

Critical alerts are triggered for:
- Session key rotation failure after retries
- Signed pre-key rotation failure after retries
- High failure rate (>20%)

## Error Handling

### Retry Logic

Failed rotations are automatically retried with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: Wait 1 second
- Attempt 3: Wait 2 seconds
- Attempt 4: Wait 4 seconds (if max retries = 4)

### Failure Recovery

If rotation fails after all retries:
1. Alert is triggered and logged
2. Metrics are updated
3. Event is logged for monitoring
4. System continues operating with existing keys
5. Next periodic check will retry rotation

## Integration

### With EncryptionService

The KeyRotationService integrates with EncryptionService:
- Uses `fetchKeyBundle()` to get new keys
- Uses `createSession()` to establish new sessions
- Uses `generateSignedPreKey()` and `generatePreKeys()` for key generation
- Uses `uploadPreKeys()` to upload new keys to server

### With KeyStorageService

The KeyRotationService uses KeyStorageService for:
- Getting session state
- Storing updated sessions
- Deleting old sessions
- Getting all active sessions

## Best Practices

1. **Start automatic rotation on app initialization**
   ```typescript
   KeyRotationService.startAutomaticRotation();
   KeyRotationService.startSignedPreKeyRotationSchedule();
   ```

2. **Monitor rotation health regularly**
   ```typescript
   const health = KeyRotationService.getRotationHealthStatus();
   if (health.status !== 'healthy') {
     // Alert admin or take corrective action
   }
   ```

3. **Use retry logic for critical rotations**
   ```typescript
   await KeyRotationService.rotateSessionKeyWithRetry(
     recipientId,
     deviceId,
     'manual',
     3
   );
   ```

4. **Check rotation metrics periodically**
   ```typescript
   const successRate = KeyRotationService.getRotationSuccessRate();
   if (successRate < 80) {
     // Investigate rotation issues
   }
   ```

5. **Stop rotation jobs on logout**
   ```typescript
   KeyRotationService.stopAutomaticRotation();
   ```

## Requirements Satisfied

This implementation satisfies the following requirements:

- **8.1**: Automatic session key rotation after 1000 messages
- **8.2**: Automatic session key rotation after 7 days
- **8.3**: Secure deletion of old session keys after rotation
- **8.4**: Rotation monitoring and metrics tracking
- **8.5**: Forward secrecy through Double Ratchet algorithm

## Testing

To test the key rotation service:

```typescript
// Test rotation check
const { needed, reason } = await KeyRotationService.checkRotationNeeded(
  'user123',
  'device456'
);

// Test manual rotation
const success = await KeyRotationService.rotateSessionKey(
  'user123',
  'device456',
  'manual'
);

// Test signed pre-key rotation
const success = await KeyRotationService.rotateSignedPreKey();

// Test metrics
const metrics = KeyRotationService.getRotationMetrics();
console.log('Metrics:', metrics);

// Test health status
const health = KeyRotationService.getRotationHealthStatus();
console.log('Health:', health);

// Clear history for testing
KeyRotationService.clearRotationHistory();
```

## Troubleshooting

### Rotation Not Happening

1. Check if automatic rotation is started
2. Verify session message count and age
3. Check rotation events for errors
4. Review health status for issues

### High Failure Rate

1. Check network connectivity
2. Verify server is responding
3. Check key bundle availability
4. Review error logs in rotation events

### Performance Issues

1. Reduce rotation check frequency if needed
2. Limit number of concurrent rotations
3. Monitor rotation duration in metrics
4. Consider batching rotations

## Future Enhancements

- Configurable rotation thresholds
- Batch rotation for multiple sessions
- Rotation scheduling based on usage patterns
- Integration with monitoring services (Sentry, DataDog)
- User notifications for rotation events
- Rotation analytics dashboard
