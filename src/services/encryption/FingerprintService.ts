import * as Crypto from 'expo-crypto';

/**
 * FingerprintService - Security code (fingerprint) generation and verification
 * 
 * Generates safety numbers from identity keys for user verification
 * Implements Signal Protocol's fingerprint format
 */

export interface Fingerprint {
  displayableFingerprint: string; // Formatted as groups of 5 digits
  rawFingerprint: string; // Raw hex string
}

class FingerprintService {
  /**
   * Generate a fingerprint (safety number) from two identity keys
   * The fingerprint is derived by hashing both users' identity keys together
   * 
   * @param localIdentityKey - Local user's public identity key
   * @param remoteIdentityKey - Remote user's public identity key
   * @param localUserId - Local user's ID (for stable ordering)
   * @param remoteUserId - Remote user's ID (for stable ordering)
   * @returns Fingerprint object with displayable and raw formats
   */
  async getFingerprint(
    localIdentityKey: Uint8Array,
    remoteIdentityKey: Uint8Array,
    localUserId: string,
    remoteUserId: string
  ): Promise<Fingerprint> {
    try {
      console.log('[FingerprintService] Generating fingerprint');

      // Ensure consistent ordering: lower user ID first
      const [firstKey, secondKey] = localUserId < remoteUserId
        ? [localIdentityKey, remoteIdentityKey]
        : [remoteIdentityKey, localIdentityKey];

      // Concatenate the two identity keys
      const combined = new Uint8Array(firstKey.length + secondKey.length);
      combined.set(firstKey, 0);
      combined.set(secondKey, firstKey.length);

      // Hash the combined keys using SHA-256
      const combinedBase64 = this.uint8ArrayToBase64(combined);
      const hashHex = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        combinedBase64
      );

      // Convert hex hash to numeric string
      // Take first 60 characters (30 bytes) for a 60-digit safety number
      const numericString = this.hexToNumericString(hashHex.substring(0, 60));

      // Format as groups of 5 digits (12 groups of 5 = 60 digits)
      const displayableFingerprint = this.formatFingerprint(numericString);

      console.log('[FingerprintService] Fingerprint generated successfully');

      return {
        displayableFingerprint,
        rawFingerprint: hashHex,
      };
    } catch (error) {
      console.error('[FingerprintService] Failed to generate fingerprint:', error);
      throw new Error('Failed to generate fingerprint');
    }
  }

  /**
   * Verify that two fingerprints match
   * 
   * @param fingerprint1 - First fingerprint to compare
   * @param fingerprint2 - Second fingerprint to compare
   * @returns True if fingerprints match, false otherwise
   */
  verifyFingerprint(fingerprint1: string, fingerprint2: string): boolean {
    // Remove all whitespace and compare
    const clean1 = fingerprint1.replace(/\s/g, '');
    const clean2 = fingerprint2.replace(/\s/g, '');
    
    return clean1 === clean2;
  }

  /**
   * Generate QR code data for fingerprint sharing
   * Returns a string that can be encoded into a QR code
   * 
   * @param fingerprint - The fingerprint to encode
   * @param localUserId - Local user's ID
   * @param remoteUserId - Remote user's ID
   * @returns QR code data string
   */
  generateQRCodeData(
    fingerprint: Fingerprint,
    localUserId: string,
    remoteUserId: string
  ): string {
    // Format: SIGNAL_FINGERPRINT:version:localUserId:remoteUserId:rawFingerprint
    return `SIGNAL_FINGERPRINT:1:${localUserId}:${remoteUserId}:${fingerprint.rawFingerprint}`;
  }

  /**
   * Parse QR code data to extract fingerprint information
   * 
   * @param qrData - QR code data string
   * @returns Parsed fingerprint data or null if invalid
   */
  parseQRCodeData(qrData: string): {
    version: string;
    localUserId: string;
    remoteUserId: string;
    rawFingerprint: string;
  } | null {
    try {
      const parts = qrData.split(':');
      
      if (parts.length !== 5 || parts[0] !== 'SIGNAL_FINGERPRINT') {
        return null;
      }

      return {
        version: parts[1],
        localUserId: parts[2],
        remoteUserId: parts[3],
        rawFingerprint: parts[4],
      };
    } catch (error) {
      console.error('[FingerprintService] Failed to parse QR code data:', error);
      return null;
    }
  }

  /**
   * Convert hex string to numeric string
   * Each hex character (0-F) is converted to its numeric value (0-15)
   * 
   * @param hex - Hex string
   * @returns Numeric string
   */
  private hexToNumericString(hex: string): string {
    let result = '';
    
    for (let i = 0; i < hex.length; i++) {
      const hexChar = hex[i];
      const value = parseInt(hexChar, 16);
      result += value.toString();
    }

    // Pad or truncate to exactly 60 digits
    if (result.length < 60) {
      result = result.padEnd(60, '0');
    } else if (result.length > 60) {
      result = result.substring(0, 60);
    }

    return result;
  }

  /**
   * Format fingerprint as groups of 5 digits
   * Example: "12345 67890 12345 67890 ..."
   * 
   * @param numericString - 60-digit numeric string
   * @returns Formatted fingerprint string
   */
  private formatFingerprint(numericString: string): string {
    const groups: string[] = [];
    
    for (let i = 0; i < numericString.length; i += 5) {
      groups.push(numericString.substring(i, i + 5));
    }

    return groups.join(' ');
  }

  /**
   * Convert Uint8Array to base64 string
   */
  private uint8ArrayToBase64(array: Uint8Array): string {
    const binary = Array.from(array)
      .map(byte => String.fromCharCode(byte))
      .join('');
    return btoa(binary);
  }
}

// Export singleton instance
export default new FingerprintService();
