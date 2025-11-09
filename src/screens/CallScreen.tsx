import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWebRTC } from '../hooks/useWebRTC';
import { WebRTCView, isWebRTCAvailable } from '../components/WebRTCWrapper';

const { width, height } = Dimensions.get('window');

interface CallScreenProps {
  route: {
    params: {
      receiverId?: string;
      type?: 'voice' | 'video';
      chatId?: string;
    };
  };
  navigation: any;
}

export default function CallScreen({ route, navigation }: CallScreenProps) {
  const {
    callState,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    initiateCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera
  } = useWebRTC({
    onCallEnded: () => {
      navigation.goBack();
    },
    onCallError: (error) => {
      console.error('Call error:', error);
      navigation.goBack();
    }
  });

  // Initiate call if receiverId is provided
  React.useEffect(() => {
    if (route.params?.receiverId && route.params?.type) {
      initiateCall(route.params.receiverId, route.params.type, route.params.chatId);
    }
  }, [route.params]);

  const handleEndCall = () => {
    endCall();
    navigation.goBack();
  };

  const handleReject = () => {
    if (callState.callId) {
      rejectCall(callState.callId);
    }
    navigation.goBack();
  };

  const handleAnswer = () => {
    if (callState.callId) {
      answerCall(callState.callId);
    }
  };

  // Incoming call UI
  if (callState.isIncoming && callState.status === 'ringing') {
    return (
      <View style={styles.container}>
        <View style={styles.incomingCallContainer}>
          <Text style={styles.callerName}>
            {callState.remoteUser?.displayName}
          </Text>
          <Text style={styles.callStatus}>
            Incoming {callState.type} call...
          </Text>

          <View style={styles.incomingCallButtons}>
            <TouchableOpacity
              style={[styles.callButton, styles.rejectButton]}
              onPress={handleReject}
            >
              <Ionicons name="call" size={32} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.callButton, styles.acceptButton]}
              onPress={handleAnswer}
            >
              <Ionicons name="call" size={32} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Active call UI
  return (
    <View style={styles.container}>
      {/* Remote Video */}
      {callState.type === 'video' && remoteStream ? (
        <WebRTCView
          streamURL={remoteStream.toURL()}
          style={styles.remoteVideo}
          objectFit="cover"
        />
      ) : (
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {callState.remoteUser?.displayName?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>
            {callState.remoteUser?.displayName}
          </Text>
          <Text style={styles.callStatus}>
            {callState.status === 'connecting' ? 'Connecting...' : 'Connected'}
          </Text>
        </View>
      )}

      {/* Local Video (Picture-in-Picture) */}
      {callState.type === 'video' && localStream && !isVideoOff && (
        <View style={styles.localVideoContainer}>
          <WebRTCView
            streamURL={localStream.toURL()}
            style={styles.localVideo}
            objectFit="cover"
            mirror={true}
          />
        </View>
      )}

      {/* Call Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controls}>
          {/* Mute Button */}
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={toggleMute}
          >
            <Ionicons
              name={isMuted ? 'mic-off' : 'mic'}
              size={28}
              color="white"
            />
          </TouchableOpacity>

          {/* End Call Button */}
          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={handleEndCall}
          >
            <Ionicons
              name="call"
              size={32}
              color="white"
              style={{ transform: [{ rotate: '135deg' }] }}
            />
          </TouchableOpacity>

          {/* Video Toggle Button (only for video calls) */}
          {callState.type === 'video' && (
            <TouchableOpacity
              style={[styles.controlButton, isVideoOff && styles.controlButtonActive]}
              onPress={toggleVideo}
            >
              <Ionicons
                name={isVideoOff ? 'videocam-off' : 'videocam'}
                size={28}
                color="white"
              />
            </TouchableOpacity>
          )}

          {/* Switch Camera Button (only for video calls) */}
          {callState.type === 'video' && !isVideoOff && (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={switchCamera}
            >
              <Ionicons name="camera-reverse" size={28} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Indicator */}
      {callState.status === 'connecting' && (
        <View style={styles.statusIndicator}>
          <Text style={styles.statusText}>Connecting...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a'
  },
  remoteVideo: {
    width: width,
    height: height
  },
  avatarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4a5568',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  avatarText: {
    fontSize: 48,
    color: 'white',
    fontWeight: 'bold'
  },
  userName: {
    fontSize: 24,
    color: 'white',
    fontWeight: '600',
    marginBottom: 8
  },
  callStatus: {
    fontSize: 16,
    color: '#9ca3af'
  },
  localVideoContainer: {
    position: 'absolute',
    top: 40,
    right: 16,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2d3748'
  },
  localVideo: {
    width: '100%',
    height: '100%'
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingHorizontal: 20
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4a5568',
    justifyContent: 'center',
    alignItems: 'center'
  },
  controlButtonActive: {
    backgroundColor: '#ef4444'
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ef4444'
  },
  statusIndicator: {
    position: 'absolute',
    top: 40,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20
  },
  statusText: {
    color: 'white',
    fontSize: 14
  },
  incomingCallContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  callerName: {
    fontSize: 28,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 8
  },
  incomingCallButtons: {
    flexDirection: 'row',
    gap: 40,
    marginTop: 60
  },
  callButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center'
  },
  rejectButton: {
    backgroundColor: '#ef4444'
  },
  acceptButton: {
    backgroundColor: '#10b981'
  }
});
