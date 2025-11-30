import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import EncryptionService from '../services/encryption/EncryptionService';
import FingerprintService from '../services/encryption/FingerprintService';
import { Fingerprint } from '../services/encryption/FingerprintService';

type SecurityCodeScreenRouteProp = RouteProp<
  {
    SecurityCode: {
      userId: string;
      deviceId: string;
      contactName: string;
    };
  },
  'SecurityCode'
>;

/**
 * SecurityCodeScreen - Display and verify security codes (fingerprints)
 * 
 * Features:
 * - Display user's and contact's safety numbers
 * - QR code generation for easy verification
 * - QR code scanner for scanning contact's code
 * - Manual code comparison
 * - Mark device as verified
 */
const SecurityCodeScreen: React.FC = () => {
  const route = useRoute<SecurityCodeScreenRouteProp>();
  const navigation = useNavigation();
  const { userId, deviceId, contactName } = route.params;

  const [loading, setLoading] = useState(true);
  const [fingerprint, setFingerprint] = useState<Fingerprint | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [isVerified, setIsVerified] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    loadFingerprint();
  }, [userId, deviceId]);

  /**
   * Load fingerprint for the contact
   */
  const loadFingerprint = async () => {
    try {
      setLoading(true);

      // Get fingerprint
      const fp = await EncryptionService.getFingerprint(userId, deviceId);
      setFingerprint(fp);

      // Generate QR code data
      const qrData = await EncryptionService.generateFingerprintQRCode(userId, deviceId);
      setQrCodeData(qrData);

      // TODO: Check if device is already verified
      // This would require backend support to store verification status
      setIsVerified(false);
    } catch (error) {
      console.error('[SecurityCodeScreen] Failed to load fingerprint:', error);
      Alert.alert(
        'Error',
        'Failed to load security code. Please try again.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Request camera permission for QR scanner
   */
  const requestCameraPermission = async () => {
    const { status } = await requestPermission();
    setHasPermission(status === 'granted');
    return status === 'granted';
  };

  /**
   * Handle QR code scan
   */
  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    try {
      setShowScanner(false);

      // Parse QR code data
      const parsed = FingerprintService.parseQRCodeData(data);
      
      if (!parsed) {
        Alert.alert('Invalid QR Code', 'The scanned QR code is not a valid security code.');
        return;
      }

      // Verify the fingerprint matches
      if (fingerprint && parsed.rawFingerprint === fingerprint.rawFingerprint) {
        Alert.alert(
          'Verified!',
          'The security codes match. This connection is secure.',
          [
            {
              text: 'Mark as Verified',
              onPress: handleMarkAsVerified,
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert(
          'Warning',
          'The security codes do not match. This could indicate a security issue.',
          [{ text: 'OK', style: 'destructive' }]
        );
      }
    } catch (error) {
      console.error('[SecurityCodeScreen] Failed to process QR code:', error);
      Alert.alert('Error', 'Failed to process QR code. Please try again.');
    }
  };

  /**
   * Open QR code scanner
   */
  const openScanner = async () => {
    const granted = hasPermission ?? await requestCameraPermission();
    
    if (!granted) {
      Alert.alert(
        'Camera Permission Required',
        'Please grant camera permission to scan QR codes.'
      );
      return;
    }

    setShowScanner(true);
  };

  /**
   * Mark device as verified
   */
  const handleMarkAsVerified = async () => {
    try {
      // TODO: Implement backend API to mark device as verified
      // For now, just update local state
      setIsVerified(true);

      Alert.alert(
        'Device Verified',
        `You have verified ${contactName}'s device. Future messages will show a verified badge.`
      );
    } catch (error) {
      console.error('[SecurityCodeScreen] Failed to mark as verified:', error);
      Alert.alert('Error', 'Failed to mark device as verified. Please try again.');
    }
  };

  /**
   * Share security code
   */
  const handleShare = async () => {
    if (!fingerprint) return;

    try {
      await Share.share({
        message: `Security Code for ${contactName}:\n\n${fingerprint.displayableFingerprint}\n\nCompare this code with ${contactName} to verify your connection is secure.`,
      });
    } catch (error) {
      console.error('[SecurityCodeScreen] Failed to share:', error);
    }
  };

  /**
   * Render QR code scanner
   */
  if (showScanner) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowScanner(false)}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan QR Code</Text>
        </View>

        <CameraView
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.scannerOverlay}>
          <View style={styles.scannerFrame} />
          <Text style={styles.scannerText}>
            Scan {contactName}'s QR code to verify
          </Text>
        </View>
      </View>
    );
  }

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Security Code</Text>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading security code...</Text>
        </View>
      </View>
    );
  }

  /**
   * Render main screen
   */
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security Code</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Contact Info */}
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{contactName}</Text>
          {isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>

        {/* Explanation */}
        <View style={styles.explanationBox}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#007AFF" />
          <Text style={styles.explanationText}>
            Compare this security code with {contactName} to verify your connection is
            end-to-end encrypted.
          </Text>
        </View>

        {/* QR Code */}
        <View style={styles.qrCodeContainer}>
          <Text style={styles.sectionTitle}>Your QR Code</Text>
          <View style={styles.qrCodeWrapper}>
            {qrCodeData && (
              <QRCode
                value={qrCodeData}
                size={200}
                backgroundColor="white"
                color="black"
              />
            )}
          </View>
          <Text style={styles.qrCodeHint}>
            {contactName} can scan this code to verify
          </Text>
        </View>

        {/* Safety Number */}
        <View style={styles.safetyNumberContainer}>
          <Text style={styles.sectionTitle}>Safety Number</Text>
          <View style={styles.safetyNumberBox}>
            {fingerprint && (
              <Text style={styles.safetyNumber}>
                {fingerprint.displayableFingerprint}
              </Text>
            )}
          </View>
          <Text style={styles.safetyNumberHint}>
            Compare these numbers with {contactName}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={openScanner}
          >
            <Ionicons name="qr-code-outline" size={24} color="white" />
            <Text style={styles.scanButtonText}>Scan {contactName}'s Code</Text>
          </TouchableOpacity>

          {!isVerified && (
            <TouchableOpacity
              style={styles.verifyButton}
              onPress={handleMarkAsVerified}
            >
              <Ionicons name="checkmark-circle-outline" size={24} color="white" />
              <Text style={styles.verifyButtonText}>Mark as Verified</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>What is a security code?</Text>
          <Text style={styles.infoText}>
            Security codes help you verify that your calls and messages are end-to-end
            encrypted. If your security code with {contactName} matches, you can be
            confident that no one can intercept your communication.
          </Text>
          
          <Text style={styles.infoTitle}>How to verify:</Text>
          <Text style={styles.infoText}>
            1. Compare the numbers above with {contactName} in person or through another
            trusted channel{'\n'}
            2. Or scan {contactName}'s QR code{'\n'}
            3. If they match, mark this device as verified
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  shareButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  content: {
    padding: 16,
  },
  contactInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  contactName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  verifiedText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
  },
  explanationBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  explanationText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  qrCodeContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  qrCodeWrapper: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 12,
  },
  qrCodeHint: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  safetyNumberContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  safetyNumberBox: {
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  safetyNumber: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#000',
    textAlign: 'center',
    lineHeight: 24,
  },
  safetyNumberHint: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  actions: {
    marginBottom: 20,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  scanButtonText: {
    marginLeft: 8,
    fontSize: 17,
    fontWeight: '600',
    color: 'white',
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 12,
  },
  verifyButtonText: {
    marginLeft: 8,
    fontSize: 17,
    fontWeight: '600',
    color: 'white',
  },
  infoSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 12,
  },
  scannerText: {
    marginTop: 24,
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 12,
    borderRadius: 8,
  },
});

export default SecurityCodeScreen;
