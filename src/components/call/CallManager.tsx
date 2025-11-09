import React from 'react';
import { View, StyleSheet } from 'react-native';
import IncomingCallScreen from './IncomingCallScreen';
import CallScreen from './CallScreen';
import { useCall } from '../../contexts/CallContext';
import { useAuth } from '../../contexts/AuthContext';

const CallManager: React.FC = () => {
  const { activeCall, isIncomingCall, acceptCall, endCall } = useCall();
  const { user } = useAuth();

  const handleAcceptCall = async () => {
    if (activeCall) {
      try {
        await acceptCall(activeCall.callId);
      } catch (error) {
        console.error('Error accepting call:', error);
      }
    }
  };

  const handleDeclineCall = () => {
    if (activeCall) {
      endCall();
    }
  };

  const handleEndCall = () => {
    endCall();
  };

  if (!activeCall) {
    return null;
  }

  if (isIncomingCall) {
    // Get caller info from the first participant
    const caller = activeCall.participants[0];
    return (
      <IncomingCallScreen
        callerName={caller?.name || 'Unknown'}
        callerAvatar={caller?.avatar}
        callType={activeCall.type}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
      />
    );
  }

  return <CallScreen callState={activeCall} onEndCall={handleEndCall} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default CallManager;
