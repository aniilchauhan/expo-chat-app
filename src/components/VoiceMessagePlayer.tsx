import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { formatDuration } from '../../utils/time';

interface VoiceMessagePlayerProps {
  url: string;
  duration: number;
  waveform: number[];
  onPlay?: () => void;
}

export function VoiceMessagePlayer({
  url,
  duration,
  waveform,
  onPlay,
}: VoiceMessagePlayerProps) {
  const [sound, setSound] = useState<Audio.Sound>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const { theme } = useTheme();
  const progress = new Animated.Value(0);

  useEffect(() => {
    loadSound();
    return () => {
      unloadSound();
    };
  }, [url]);

  const loadSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      setSound(sound);
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading sound:', error);
    }
  };

  const unloadSound = async () => {
    if (sound) {
      await sound.unloadAsync();
      setSound(undefined);
      setIsLoaded(false);
      setIsPlaying(false);
      setPosition(0);
    }
  };

  const onPlaybackStatusUpdate = (status: Audio.PlaybackStatus) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis / 1000);
      if (!status.isPlaying && status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        progress.setValue(0);
      }
    }
  };

  const togglePlayPause = async () => {
    if (!sound || !isLoaded) return;

    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      if (position >= duration) {
        await sound.setPositionAsync(0);
      }
      await sound.playAsync();
      onPlay?.();

      // Animate progress bar
      Animated.timing(progress, {
        toValue: 1,
        duration: (duration - position) * 1000,
        useNativeDriver: false,
      }).start();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = async (value: number) => {
    if (!sound || !isLoaded) return;
    const newPosition = value * duration;
    await sound.setPositionAsync(newPosition * 1000);
    setPosition(newPosition);
    progress.setValue(value);
  };

  const renderWaveform = () => {
    return (
      <View style={styles.waveformContainer}>
        {waveform.map((value, index) => (
          <View
            key={index}
            style={[
              styles.waveformBar,
              {
                height: value * 40,
                backgroundColor:
                  (position / duration) * waveform.length > index
                    ? theme.colors.primary
                    : theme.colors.disabled,
              },
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={togglePlayPause}
        disabled={!isLoaded}
        style={[styles.playButton, { backgroundColor: theme.colors.primary }]}
      >
        <MaterialIcons
          name={isPlaying ? 'pause' : 'play-arrow'}
          size={24}
          color="white"
        />
      </TouchableOpacity>

      <View style={styles.content}>
        {renderWaveform()}
        <View style={styles.timeContainer}>
          <Text style={[styles.timeText, { color: theme.colors.text }]}>
            {formatDuration(position)}
          </Text>
          <Text style={[styles.timeText, { color: theme.colors.text }]}>
            {formatDuration(duration)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  waveformContainer: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  waveformBar: {
    width: 3,
    borderRadius: 1.5,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
  },
});
