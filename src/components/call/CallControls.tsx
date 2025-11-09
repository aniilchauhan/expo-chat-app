import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

interface CallControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isSpeakerEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
}

const CallControls: React.FC<CallControlsProps> = ({
  isAudioEnabled,
  isVideoEnabled,
  isSpeakerEnabled,
  onToggleAudio,
  onToggleVideo,
  onToggleSpeaker,
  onEndCall,
}) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.controlButton, !isAudioEnabled && styles.controlButtonDisabled]}
        onPress={onToggleAudio}
      >
        <Ionicons
          name={isAudioEnabled ? 'mic' : 'mic-off'}
          size={24}
          color={isAudioEnabled ? theme.colors.primary : '#fff'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.controlButton, !isVideoEnabled && styles.controlButtonDisabled]}
        onPress={onToggleVideo}
      >
        <Ionicons
          name={isVideoEnabled ? 'videocam' : 'videocam-off'}
          size={24}
          color={isVideoEnabled ? theme.colors.primary : '#fff'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.controlButton, !isSpeakerEnabled && styles.controlButtonDisabled]}
        onPress={onToggleSpeaker}
      >
        <Ionicons
          name={isSpeakerEnabled ? 'volume-high' : 'volume-mute'}
          size={24}
          color={isSpeakerEnabled ? theme.colors.primary : '#fff'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.controlButton, styles.endCallButton]}
        onPress={onEndCall}
      >
        <Ionicons name="call" size={24} color="#fff" style={styles.rotated} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonDisabled: {
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
  },
  endCallButton: {
    backgroundColor: '#ff3b30',
  },
  rotated: {
    transform: [{ rotate: '135deg' }],
  },
});

export default CallControls;
