import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { CallParticipant } from '../../types/webrtc';

interface CallGridProps {
  participants: CallParticipant[];
  localStream: any;
  isVideoEnabled: boolean;
}

const CallGrid: React.FC<CallGridProps> = ({ participants, localStream, isVideoEnabled }) => {
  const [layout, setLayout] = useState<{ width: number; height: number; columns: number }>({
    width: 0,
    height: 0,
    columns: 1,
  });

  useEffect(() => {
    const { width, height } = Dimensions.get('window');
    const totalParticipants = participants.length + 1; // Including local stream
    const columns = totalParticipants <= 2 ? 1 : totalParticipants <= 4 ? 2 : 3;
    const rows = Math.ceil(totalParticipants / columns);

    setLayout({
      width: width / columns,
      height: height / rows,
      columns,
    });
  }, [participants.length]);

  const renderParticipant = (participant: CallParticipant | null, index: number) => {
    const stream = participant ? participant.stream : localStream;
    const isLocal = !participant;

    return (
      <View
        key={participant?.userId || 'local'}
        style={[
          styles.participantContainer,
          {
            width: layout.width,
            height: layout.height,
          },
        ]}
      >
        {stream && isVideoEnabled ? (
          <RTCView
            streamURL={stream.toURL()}
            style={styles.participantVideo}
            objectFit="cover"
            mirror={isLocal}
          />
        ) : (
          <View style={styles.avatarContainer}>
            {/* Add avatar or initials here */}
          </View>
        )}
        {/* Add name label and audio indicator */}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderParticipant(null, -1)} {/* Local stream */}
      {participants.map((participant, index) => renderParticipant(participant, index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#1a1a1a',
  },
  participantContainer: {
    position: 'relative',
  },
  participantVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  avatarContainer: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CallGrid;
