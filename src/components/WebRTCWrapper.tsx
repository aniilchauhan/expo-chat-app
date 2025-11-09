import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Try to import RTCView, but make it optional
let RTCView: any = null;
let isWebRTCAvailable = false;

try {
  const webrtc = require('react-native-webrtc');
  RTCView = webrtc.RTCView;
  isWebRTCAvailable = true;
} catch (error) {
  console.warn('WebRTC RTCView not available');
  isWebRTCAvailable = false;
}

interface WebRTCViewProps {
  streamURL?: any;
  style?: any;
  objectFit?: 'contain' | 'cover';
  mirror?: boolean;
  zOrder?: number;
}

export function WebRTCView(props: WebRTCViewProps) {
  if (!isWebRTCAvailable || !RTCView) {
    return (
      <View style={[styles.placeholder, props.style]}>
        <Text style={styles.placeholderText}>
          Video not available in Expo Go
        </Text>
        <Text style={styles.placeholderSubtext}>
          Use development build for video calls
        </Text>
      </View>
    );
  }

  return <RTCView {...props} />;
}

export { isWebRTCAvailable };

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderSubtext: {
    color: '#999999',
    fontSize: 14,
    textAlign: 'center',
  },
});
