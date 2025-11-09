import React, { useEffect, useState } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { CallState } from '../../types/webrtc';
import CallGrid from './CallGrid';
import CallControls from './CallControls';
import { useTheme } from '../../contexts/ThemeContext';
import { useCall } from '../../contexts/CallContext';
import InCallManager from 'react-native-incall-manager';

interface CallScreenProps {
  callState: CallState;
  onEndCall: () => void;
}

const CallScreen: React.FC<CallScreenProps> = ({ callState, onEndCall }) => {
  const theme = useTheme();
  const { localStreamEnabled, toggleAudio, toggleVideo } = useCall();
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(callState.type === 'video');
  const [localStream, setLocalStream] = useState<any>(null);

  useEffect(() => {
    // Initialize InCallManager
    InCallManager.start({ media: callState.type === 'video' ? 'video' : 'audio' });
    InCallManager.setForceSpeakerphoneOn(callState.type === 'video');

    // Set up local stream from WebRTC service
    setLocalStream(webRTCService.getLocalStream());

    return () => {
      InCallManager.stop();
    };
  }, []);

  const handleToggleAudio = () => {
    toggleAudio();
  };

  const handleToggleVideo = () => {
    if (callState.type === 'video') {
      toggleVideo();
    }
  };

  const handleToggleSpeaker = () => {
    const newSpeakerState = !isSpeakerEnabled;
    InCallManager.setForceSpeakerphoneOn(newSpeakerState);
    setIsSpeakerEnabled(newSpeakerState);
  };

  const handleEndCall = () => {
    webRTCService.endCall();
    onEndCall();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.gridContainer}>
        <CallGrid
          participants={callState.participants}
          localStream={localStream}
          isVideoEnabled={localStreamEnabled.video}
        />
      </View>

      <View style={styles.controlsContainer}>
        <CallControls
          isAudioEnabled={localStreamEnabled.audio}
          isVideoEnabled={localStreamEnabled.video}
          isSpeakerEnabled={isSpeakerEnabled}
          onToggleAudio={handleToggleAudio}
          onToggleVideo={handleToggleVideo}
          onToggleSpeaker={handleToggleSpeaker}
          onEndCall={onEndCall}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gridContainer: {
    flex: 1,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});

export default CallScreen;
