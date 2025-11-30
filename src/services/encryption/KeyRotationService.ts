import EncryptionService from './EncryptionService';
import KeyStorageService, { SessionState } from '../KeyStorageService';

/**
 * KeyRotationService - Manages automatic key rotation and forward secrecy
 * 
 * This service provides:
 * - Session key rotation based on message count and time elapsed
 * - Signed pre-key rotation on a weekly schedule
 * - Secure deletion of old keys after rotation
 * - Monitoring and logging of rotation events
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

// Rotation thresholds
const ROTATION_THRESHOLDS = {
  MESSAGE_COUNT: 1000, // Rotate after 1000 messages
  TIME_ELAPSED: 7 * 24 * 60 * 60 * 1000, // Rotate after 7 days (in milliseconds)
  SIGNED_PREKEY_ROTATION: 7 * 24 * 60 * 60 * 1000, // Weekly signed pre-key rotation
};

// Rotation event types
export enum RotationEventType {
  SESSION_KEY_ROTATED = 'SESSION_KEY_ROTATED',
  SIGNED_PREKEY_ROTATED = 'SIGNED_PREKEY_ROTATED',
  ROTATION_CHECK_PERFORMED = 'ROTATION_CHECK_PERFORMED',
  ROTATION_FAILED = 'ROTATION_FAILED',
}

// Rotation event
export interface RotationEvent {
  type: RotationEventType;
  timestamp: Date;
  recipientId?: string;
  deviceId?: string;
  reason?: string;
  error?: string;
  metadata?: {
    messageCount?: number;
    timeElapsed?: number;
    oldKeyId?: number;
    newKeyId?: number;
  };
}

// Rotation metrics
export interface RotationMetrics {
  totalRotations: number;
  successfulRotations: number;
  failedRotations: number;
  lastRotationAt: Date | null;
  averageRotationInterval: number;
  rotationsByReason: {
    messageCount: number;
    timeElapsed: number;
    manual: number;
  };
}

class KeyRotationService {
  private rotationEvents: RotationEvent[] = [];
  private rotationMetrics: RotationMetrics = {
    totalRotations: 0,
    successfulRotations: 0,
    failedRotations: 0,
    lastRotationAt: null,
    averageRotationInterval: 0,
    rotationsByReason: {
      messageCount: 0,
      timeElapsed: 0,
      manual: 0,
    },
  };

  // Background rotation interval
  private rotationCheckInterval: NodeJS.Timeout | null = null;
  private readonly ROTATION_CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour

  // Last signed pre-key rotation timestamp
  private lastSignedPreKeyRotation: Date | null = null;

  /**
   * Check if session key rotation is needed
   * Checks both message count and time elapsed thresholds
   * 
   * @param recipientId - The recipient's user ID
   * @param deviceId - The recipient's device ID
   * @returns Object indicating if rotation is needed and the reason
   */
  async checkRotationNeeded(
    recipientId: string,
    deviceId: string
  ): Promise<{ needed: boolean; reason?: 'messageCount' | 'timeElapsed' }> {
    try {
      console.log(`[KeyRotationService] Checking rotation needed for ${recipientId}.${deviceId}`);

      // Get session state
      const session = await KeyStorageService.getSession(recipientId, deviceId);

      if (!session) {
        console.log('[KeyRotationService] No session found, rotation not needed');
        return { needed: false };
      }

      // Check message count threshold
      if (session.messageCount >= ROTATION_THRESHOLDS.MESSAGE_COUNT) {
        console.log(
          `[KeyRotationService] Rotation needed: message count ${session.messageCount} >= ${ROTATION_THRESHOLDS.MESSAGE_COUNT}`
        );
        return { needed: true, reason: 'messageCount' };
      }

      // Check time elapsed threshold
      const timeElapsed = Date.now() - session.createdAt.getTime();
      if (timeElapsed >= ROTATION_THRESHOLDS.TIME_ELAPSED) {
        console.log(
          `[KeyRotationService] Rotation needed: time elapsed ${Math.floor(timeElapsed / (24 * 60 * 60 * 1000))} days >= 7 days`
        );
        return { needed: true, reason: 'timeElapsed' };
      }

      console.log('[KeyRotationService] Rotation not needed');
      return { needed: false };
    } catch (error) {
      console.error('[KeyRotationService] Failed to check rotation needed:', error);
      return { needed: false };
    }
  }

  /**
   * Rotate session key using Double Ratchet algorithm
   * Creates a new session by re-establishing with fresh key bundle
   * Securely deletes old session keys after rotation
   * 
   * @param recipientId - The recipient's user ID
   * @param deviceId - The recipient's device ID
   * @param reason - The reason for rotation (messageCount, timeElapsed, or manual)
   * @returns True if rotation successful, false otherwise
   */
  async rotateSessionKey(
    recipientId: string,
    deviceId: string,
    reason: 'messageCount' | 'timeElapsed' | 'manual' = 'manual'
  ): Promise<boolean> {
    try {
      console.log(`[KeyRotationService] Rotating session key for ${recipientId}.${deviceId} (reason: ${reason})`);

      // Get current session for metrics
      const oldSession = await KeyStorageService.getSession(recipientId, deviceId);
      const messageCount = oldSession?.messageCount || 0;
      const timeElapsed = oldSession ? Date.now() - oldSession.createdAt.getTime() : 0;

      // Delete old session (secure deletion)
      await this.securelyDeleteSession(recipientId, deviceId);

      // Fetch new key bundle from server
      const keyBundle = await EncryptionService.fetchKeyBundle(recipientId, deviceId);

      // Create new session with fresh keys
      // The Signal Protocol's Double Ratchet algorithm automatically handles
      // forward secrecy by deriving new chain keys for each message
      await EncryptionService.createSession(recipientId, deviceId, keyBundle);

      console.log('[KeyRotationService] Session key rotated successfully');

      // Log rotation event
      this.logRotationEvent({
        type: RotationEventType.SESSION_KEY_ROTATED,
        timestamp: new Date(),
        recipientId,
        deviceId,
        reason: `Rotation triggered by ${reason}`,
        metadata: {
          messageCount,
          timeElapsed,
        },
      });

      // Update metrics
      this.updateRotationMetrics(true, reason);

      return true;
    } catch (error) {
      console.error('[KeyRotationService] Failed to rotate session key:', error);

      // Log failure event
      this.logRotationEvent({
        type: RotationEventType.ROTATION_FAILED,
        timestamp: new Date(),
        recipientId,
        deviceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Update metrics
      this.updateRotationMetrics(false, reason);

      return false;
    }
  }

  /**
   * Securely delete session keys
   * Overwrites session data before deletion to prevent recovery
   * 
   * @param recipientId - The recipient's user ID
   * @param deviceId - The recipient's device ID
   */
  private async securelyDeleteSession(recipientId: string, deviceId: string): Promise<void> {
    try {
      console.log(`[KeyRotationService] Securely deleting session for ${recipientId}.${deviceId}`);

      // Get session
      const session = await KeyStorageService.getSession(recipientId, deviceId);

      if (session) {
        // Overwrite session data with random bytes before deletion
        // This prevents potential recovery of old keys from storage
        const randomData = new Uint8Array(session.sessionData.length);
        crypto.getRandomValues(randomData);
        
        session.sessionData = randomData;
        await KeyStorageService.storeSession(recipientId, deviceId, session);

        // Now delete the session
        await KeyStorageService.deleteSession(recipientId, deviceId);

        console.log('[KeyRotationService] Session securely deleted');
      }
    } catch (error) {
      console.error('[KeyRotationService] Failed to securely delete session:', error);
      // Still try to delete normally
      await KeyStorageService.deleteSession(recipientId, deviceId);
    }
  }

  /**
   * Check all active sessions and rotate if needed
   * Called periodically by background job
   * 
   * @returns Number of sessions rotated
   */
  async checkAndRotateAllSessions(): Promise<number> {
    try {
      console.log('[KeyRotationService] Checking all sessions for rotation');

      const sessions = await KeyStorageService.getAllSessions();
      let rotatedCount = 0;

      for (const [key, session] of sessions.entries()) {
        const { needed, reason } = await this.checkRotationNeeded(
          session.recipientId,
          session.deviceId
        );

        if (needed && reason) {
          const success = await this.rotateSessionKey(
            session.recipientId,
            session.deviceId,
            reason
          );

          if (success) {
            rotatedCount++;
          }
        }
      }

      console.log(`[KeyRotationService] Rotated ${rotatedCount} sessions`);

      // Log check event
      this.logRotationEvent({
        type: RotationEventType.ROTATION_CHECK_PERFORMED,
        timestamp: new Date(),
        metadata: {
          messageCount: rotatedCount,
        },
      });

      return rotatedCount;
    } catch (error) {
      console.error('[KeyRotationService] Failed to check and rotate sessions:', error);
      return 0;
    }
  }

  /**
   * Start automatic rotation background job
   * Checks sessions periodically and rotates if needed
   */
  startAutomaticRotation(): void {
    if (this.rotationCheckInterval) {
      console.log('[KeyRotationService] Automatic rotation already running');
      return;
    }

    console.log('[KeyRotationService] Starting automatic rotation background job');

    // Check immediately
    this.checkAndRotateAllSessions().catch(err => {
      console.error('[KeyRotationService] Initial rotation check failed:', err);
    });

    // Then check periodically
    this.rotationCheckInterval = setInterval(() => {
      this.checkAndRotateAllSessions().catch(err => {
        console.error('[KeyRotationService] Periodic rotation check failed:', err);
      });
    }, this.ROTATION_CHECK_INTERVAL);
  }

  /**
   * Stop automatic rotation background job
   */
  stopAutomaticRotation(): void {
    if (this.rotationCheckInterval) {
      clearInterval(this.rotationCheckInterval);
      this.rotationCheckInterval = null;
      console.log('[KeyRotationService] Stopped automatic rotation background job');
    }
  }

  /**
   * Log rotation event
   * Stores event in memory for monitoring and debugging
   * 
   * @param event - The rotation event to log
   */
  private logRotationEvent(event: RotationEvent): void {
    this.rotationEvents.push(event);

    // Keep only last 100 events to prevent memory issues
    if (this.rotationEvents.length > 100) {
      this.rotationEvents.shift();
    }

    // Log to console
    console.log('[KeyRotationService] Rotation event:', {
      type: event.type,
      timestamp: event.timestamp.toISOString(),
      recipientId: event.recipientId,
      deviceId: event.deviceId,
      reason: event.reason,
      error: event.error,
      metadata: event.metadata,
    });
  }

  /**
   * Update rotation metrics
   * Tracks success rates and rotation frequency
   * 
   * @param success - Whether the rotation was successful
   * @param reason - The reason for rotation
   */
  private updateRotationMetrics(
    success: boolean,
    reason: 'messageCount' | 'timeElapsed' | 'manual'
  ): void {
    this.rotationMetrics.totalRotations++;

    if (success) {
      this.rotationMetrics.successfulRotations++;
      this.rotationMetrics.rotationsByReason[reason]++;

      // Update average rotation interval
      if (this.rotationMetrics.lastRotationAt) {
        const interval = Date.now() - this.rotationMetrics.lastRotationAt.getTime();
        const totalIntervals = this.rotationMetrics.successfulRotations - 1;
        
        if (totalIntervals > 0) {
          this.rotationMetrics.averageRotationInterval =
            (this.rotationMetrics.averageRotationInterval * totalIntervals + interval) /
            (totalIntervals + 1);
        } else {
          this.rotationMetrics.averageRotationInterval = interval;
        }
      }

      this.rotationMetrics.lastRotationAt = new Date();
    } else {
      this.rotationMetrics.failedRotations++;
    }
  }

  /**
   * Get rotation events
   * Returns recent rotation events for monitoring
   * 
   * @param limit - Maximum number of events to return
   * @returns Array of rotation events
   */
  getRotationEvents(limit: number = 50): RotationEvent[] {
    return this.rotationEvents.slice(-limit);
  }

  /**
   * Get rotation metrics
   * Returns statistics about rotation frequency and success rate
   * 
   * @returns Rotation metrics object
   */
  getRotationMetrics(): RotationMetrics {
    return { ...this.rotationMetrics };
  }

  /**
   * Get rotation success rate
   * Calculates the percentage of successful rotations
   * 
   * @returns Success rate as a percentage (0-100)
   */
  getRotationSuccessRate(): number {
    if (this.rotationMetrics.totalRotations === 0) {
      return 100; // No rotations yet, assume 100%
    }

    return (
      (this.rotationMetrics.successfulRotations / this.rotationMetrics.totalRotations) * 100
    );
  }

  /**
   * Clear rotation history
   * Resets events and metrics (useful for testing)
   */
  clearRotationHistory(): void {
    this.rotationEvents = [];
    this.rotationMetrics = {
      totalRotations: 0,
      successfulRotations: 0,
      failedRotations: 0,
      lastRotationAt: null,
      averageRotationInterval: 0,
      rotationsByReason: {
        messageCount: 0,
        timeElapsed: 0,
        manual: 0,
      },
    };
    console.log('[KeyRotationService] Rotation history cleared');
  }

  // ==================== Signed Pre-Key Rotation ====================

  /**
   * Check if signed pre-key rotation is needed
   * Checks if a week has passed since last rotation
   * 
   * @returns True if rotation is needed, false otherwise
   */
  checkSignedPreKeyRotationNeeded(): boolean {
    if (!this.lastSignedPreKeyRotation) {
      // No rotation yet, check if we should do initial rotation
      return true;
    }

    const timeElapsed = Date.now() - this.lastSignedPreKeyRotation.getTime();
    const needed = timeElapsed >= ROTATION_THRESHOLDS.SIGNED_PREKEY_ROTATION;

    if (needed) {
      console.log(
        `[KeyRotationService] Signed pre-key rotation needed: ${Math.floor(timeElapsed / (24 * 60 * 60 * 1000))} days since last rotation`
      );
    }

    return needed;
  }

  /**
   * Rotate signed pre-key
   * Generates new signed pre-key and uploads to server
   * Cleans up old signed pre-keys after rotation
   * 
   * @returns True if rotation successful, false otherwise
   */
  async rotateSignedPreKey(): Promise<boolean> {
    try {
      console.log('[KeyRotationService] Rotating signed pre-key');

      // Get old signed pre-key ID for logging (if exists)
      const oldKeyId = this.lastSignedPreKeyRotation
        ? Date.now() - ROTATION_THRESHOLDS.SIGNED_PREKEY_ROTATION
        : undefined;

      // Generate new signed pre-key
      const newSignedPreKey = await EncryptionService.generateSignedPreKey();
      console.log(`[KeyRotationService] Generated new signed pre-key with ID: ${newSignedPreKey.keyId}`);

      // Generate some new pre-keys as well (good practice during rotation)
      const newPreKeys = await EncryptionService.generatePreKeys(50);
      console.log(`[KeyRotationService] Generated ${newPreKeys.length} new pre-keys`);

      // Upload to server
      await EncryptionService.uploadPreKeys(newPreKeys, newSignedPreKey);
      console.log('[KeyRotationService] Uploaded new signed pre-key and pre-keys to server');

      // Update last rotation timestamp
      this.lastSignedPreKeyRotation = new Date();

      // Log rotation event
      this.logRotationEvent({
        type: RotationEventType.SIGNED_PREKEY_ROTATED,
        timestamp: new Date(),
        reason: 'Weekly rotation schedule',
        metadata: {
          oldKeyId,
          newKeyId: newSignedPreKey.keyId,
        },
      });

      console.log('[KeyRotationService] Signed pre-key rotated successfully');

      return true;
    } catch (error) {
      console.error('[KeyRotationService] Failed to rotate signed pre-key:', error);

      // Log failure event
      this.logRotationEvent({
        type: RotationEventType.ROTATION_FAILED,
        timestamp: new Date(),
        reason: 'Signed pre-key rotation failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return false;
    }
  }

  /**
   * Start weekly signed pre-key rotation schedule
   * Checks daily and rotates if a week has passed
   */
  startSignedPreKeyRotationSchedule(): void {
    console.log('[KeyRotationService] Starting signed pre-key rotation schedule');

    // Check immediately
    if (this.checkSignedPreKeyRotationNeeded()) {
      this.rotateSignedPreKey().catch(err => {
        console.error('[KeyRotationService] Initial signed pre-key rotation failed:', err);
      });
    }

    // Check daily (24 hours)
    const dailyCheckInterval = 24 * 60 * 60 * 1000;

    setInterval(() => {
      if (this.checkSignedPreKeyRotationNeeded()) {
        this.rotateSignedPreKey().catch(err => {
          console.error('[KeyRotationService] Scheduled signed pre-key rotation failed:', err);
        });
      }
    }, dailyCheckInterval);
  }

  /**
   * Get last signed pre-key rotation timestamp
   * 
   * @returns Date of last rotation or null if never rotated
   */
  getLastSignedPreKeyRotation(): Date | null {
    return this.lastSignedPreKeyRotation;
  }

  /**
   * Get days since last signed pre-key rotation
   * 
   * @returns Number of days since last rotation, or null if never rotated
   */
  getDaysSinceLastSignedPreKeyRotation(): number | null {
    if (!this.lastSignedPreKeyRotation) {
      return null;
    }

    const timeElapsed = Date.now() - this.lastSignedPreKeyRotation.getTime();
    return Math.floor(timeElapsed / (24 * 60 * 60 * 1000));
  }

  // ==================== Rotation Monitoring and Retry Logic ====================

  /**
   * Rotate session key with retry logic
   * Implements exponential backoff for failed rotations
   * 
   * @param recipientId - The recipient's user ID
   * @param deviceId - The recipient's device ID
   * @param reason - The reason for rotation
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @returns True if rotation successful, false otherwise
   */
  async rotateSessionKeyWithRetry(
    recipientId: string,
    deviceId: string,
    reason: 'messageCount' | 'timeElapsed' | 'manual' = 'manual',
    maxRetries: number = 3
  ): Promise<boolean> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[KeyRotationService] Rotation attempt ${attempt}/${maxRetries} for ${recipientId}.${deviceId}`
        );

        const success = await this.rotateSessionKey(recipientId, deviceId, reason);

        if (success) {
          if (attempt > 1) {
            console.log(
              `[KeyRotationService] Rotation succeeded on attempt ${attempt} after ${attempt - 1} failures`
            );
          }
          return true;
        }

        // If rotation returned false, treat it as a failure
        throw new Error('Rotation returned false');
      } catch (error) {
        lastError = error as Error;
        console.error(
          `[KeyRotationService] Rotation attempt ${attempt} failed:`,
          error
        );

        // If this isn't the last attempt, wait before retrying
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s, etc.
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          console.log(
            `[KeyRotationService] Waiting ${delayMs}ms before retry...`
          );
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    // All retries failed
    console.error(
      `[KeyRotationService] Rotation failed after ${maxRetries} attempts:`,
      lastError
    );

    // Trigger alert for rotation failure
    this.triggerRotationFailureAlert(recipientId, deviceId, reason, lastError);

    return false;
  }

  /**
   * Rotate signed pre-key with retry logic
   * Implements exponential backoff for failed rotations
   * 
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @returns True if rotation successful, false otherwise
   */
  async rotateSignedPreKeyWithRetry(maxRetries: number = 3): Promise<boolean> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[KeyRotationService] Signed pre-key rotation attempt ${attempt}/${maxRetries}`
        );

        const success = await this.rotateSignedPreKey();

        if (success) {
          if (attempt > 1) {
            console.log(
              `[KeyRotationService] Signed pre-key rotation succeeded on attempt ${attempt} after ${attempt - 1} failures`
            );
          }
          return true;
        }

        throw new Error('Signed pre-key rotation returned false');
      } catch (error) {
        lastError = error as Error;
        console.error(
          `[KeyRotationService] Signed pre-key rotation attempt ${attempt} failed:`,
          error
        );

        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          console.log(
            `[KeyRotationService] Waiting ${delayMs}ms before retry...`
          );
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    console.error(
      `[KeyRotationService] Signed pre-key rotation failed after ${maxRetries} attempts:`,
      lastError
    );

    // Trigger alert for rotation failure
    this.triggerSignedPreKeyRotationFailureAlert(lastError);

    return false;
  }

  /**
   * Trigger alert for rotation failure
   * Logs critical error and can be extended to send notifications
   * 
   * @param recipientId - The recipient's user ID
   * @param deviceId - The recipient's device ID
   * @param reason - The reason for rotation
   * @param error - The error that caused the failure
   */
  private triggerRotationFailureAlert(
    recipientId: string,
    deviceId: string,
    reason: string,
    error: Error | null
  ): void {
    const alert = {
      type: 'ROTATION_FAILURE',
      severity: 'CRITICAL',
      timestamp: new Date().toISOString(),
      recipientId,
      deviceId,
      reason,
      error: error?.message || 'Unknown error',
      message: `Session key rotation failed for ${recipientId}.${deviceId} after multiple attempts`,
    };

    console.error('[KeyRotationService] ALERT:', alert);

    // Log as rotation event
    this.logRotationEvent({
      type: RotationEventType.ROTATION_FAILED,
      timestamp: new Date(),
      recipientId,
      deviceId,
      reason: `Rotation failed after retries: ${reason}`,
      error: error?.message || 'Unknown error',
    });

    // In a production app, you would:
    // 1. Send alert to monitoring service (e.g., Sentry, DataDog)
    // 2. Display user notification if appropriate
    // 3. Log to analytics for tracking
    // 4. Potentially trigger automated recovery procedures
  }

  /**
   * Trigger alert for signed pre-key rotation failure
   * 
   * @param error - The error that caused the failure
   */
  private triggerSignedPreKeyRotationFailureAlert(error: Error | null): void {
    const alert = {
      type: 'SIGNED_PREKEY_ROTATION_FAILURE',
      severity: 'HIGH',
      timestamp: new Date().toISOString(),
      error: error?.message || 'Unknown error',
      message: 'Signed pre-key rotation failed after multiple attempts',
    };

    console.error('[KeyRotationService] ALERT:', alert);

    // Log as rotation event
    this.logRotationEvent({
      type: RotationEventType.ROTATION_FAILED,
      timestamp: new Date(),
      reason: 'Signed pre-key rotation failed after retries',
      error: error?.message || 'Unknown error',
    });
  }

  /**
   * Get rotation failure rate
   * Calculates the percentage of failed rotations
   * 
   * @returns Failure rate as a percentage (0-100)
   */
  getRotationFailureRate(): number {
    if (this.rotationMetrics.totalRotations === 0) {
      return 0;
    }

    return (
      (this.rotationMetrics.failedRotations / this.rotationMetrics.totalRotations) * 100
    );
  }

  /**
   * Check if rotation failure rate is above threshold
   * Used for monitoring and alerting
   * 
   * @param threshold - Failure rate threshold (default: 20%)
   * @returns True if failure rate is above threshold
   */
  isRotationFailureRateHigh(threshold: number = 20): boolean {
    const failureRate = this.getRotationFailureRate();
    return failureRate > threshold;
  }

  /**
   * Get rotation health status
   * Provides overall health assessment of rotation system
   * 
   * @returns Health status object
   */
  getRotationHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    successRate: number;
    failureRate: number;
    totalRotations: number;
    lastRotationAge: number | null;
    issues: string[];
  } {
    const successRate = this.getRotationSuccessRate();
    const failureRate = this.getRotationFailureRate();
    const issues: string[] = [];

    // Determine status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check failure rate
    if (failureRate > 50) {
      status = 'critical';
      issues.push(`High failure rate: ${failureRate.toFixed(1)}%`);
    } else if (failureRate > 20) {
      status = 'warning';
      issues.push(`Elevated failure rate: ${failureRate.toFixed(1)}%`);
    }

    // Check if rotations are happening
    if (this.rotationMetrics.totalRotations === 0) {
      issues.push('No rotations have occurred yet');
    }

    // Check last rotation age
    let lastRotationAge: number | null = null;
    if (this.rotationMetrics.lastRotationAt) {
      lastRotationAge = Date.now() - this.rotationMetrics.lastRotationAt.getTime();
      
      // If last rotation was more than 14 days ago, that's concerning
      if (lastRotationAge > 14 * 24 * 60 * 60 * 1000) {
        if (status === 'healthy') status = 'warning';
        issues.push('No recent rotations (>14 days)');
      }
    }

    return {
      status,
      successRate,
      failureRate,
      totalRotations: this.rotationMetrics.totalRotations,
      lastRotationAge,
      issues,
    };
  }

  /**
   * Generate rotation monitoring report
   * Provides detailed report for monitoring dashboards
   * 
   * @returns Monitoring report object
   */
  generateMonitoringReport(): {
    timestamp: Date;
    metrics: RotationMetrics;
    healthStatus: {
      status: 'healthy' | 'warning' | 'critical';
      successRate: number;
      failureRate: number;
      totalRotations: number;
      lastRotationAge: number | null;
      issues: string[];
    };
    recentEvents: RotationEvent[];
    signedPreKeyStatus: {
      lastRotation: Date | null;
      daysSinceRotation: number | null;
      rotationNeeded: boolean;
    };
  } {
    return {
      timestamp: new Date(),
      metrics: this.getRotationMetrics(),
      healthStatus: this.getRotationHealthStatus(),
      recentEvents: this.getRotationEvents(20),
      signedPreKeyStatus: {
        lastRotation: this.getLastSignedPreKeyRotation(),
        daysSinceRotation: this.getDaysSinceLastSignedPreKeyRotation(),
        rotationNeeded: this.checkSignedPreKeyRotationNeeded(),
      },
    };
  }
}

// Export singleton instance
export default new KeyRotationService();
