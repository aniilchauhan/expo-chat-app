import React from 'react';
import { View, Text, StyleSheet, Image, Animated, Easing } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

interface IncomingCallScreenProps {
  callerName: string;
  callerAvatar?: string;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onDecline: () => void;
}

const IncomingCallScreen: React.FC<IncomingCallScreenProps> = ({
  callerName,
  callerAvatar,
  callType,
  onAccept,
  onDecline,
}) => {
  const theme = useTheme();
  const [animation] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(animation, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const scale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  return (
    <View style={styles.container}>
      <View style={styles.callerInfo}>
        <Animated.View style={[styles.avatarContainer, { transform: [{ scale }] }]}>
          {callerAvatar ? (
            <Image source={{ uri: callerAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.avatarText}>{callerName[0].toUpperCase()}</Text>
            </View>
          )}
        </Animated.View>
        <Text style={styles.callerName}>{callerName}</Text>
        <Text style={styles.callType}>
          Incoming {callType === 'video' ? 'Video' : 'Voice'} Call
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#ff3b30' }]}
          onPress={onDecline}
        >
          <Ionicons name="close" size={30} color="#fff" />
          <Text style={styles.actionText}>Decline</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#34c759' }]}
          onPress={onAccept}
        >
          <Ionicons
            name={callType === 'video' ? 'videocam' : 'call'}
            size={30}
            color="#fff"
          />
          <Text style={styles.actionText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  callerInfo: {
    alignItems: 'center',
    marginTop: 100,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  callerName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  callType: {
    color: '#999',
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingBottom: 50,
  },
  actionButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    marginTop: 5,
    fontSize: 12,
  },
});

export default IncomingCallScreen;
