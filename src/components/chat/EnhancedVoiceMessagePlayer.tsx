import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { formatDuration } from '../../utils/time';
import { WaveformVisualizer } from './WaveformVisualizer';
import { voiceMessagesAPI } from '../../api';
import { VoiceMessage } from '../../types';

interface EnhancedVoiceMessagePlayerProps {
  voiceMessage: VoiceMessage;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (position: number) => void;
  showTranscription?: boolean;
  autoPlay?: boolean;
}

export const EnhancedVoiceMessagePlayer: React.FC<EnhancedVoiceMessagePlayerProps> = ({
  voiceMessage,
  onPlay,
  onPause,
  onSeek,
  showTranscription = true,
  autoPlay = false,
}) => {
  const [sound, setSound] = useState<Audio.Sound>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcription, setTranscription] = useState(voiceMessage.transcription);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showFullTranscription, setShowFullTranscription] = useState(false);

  const { theme } = useTheme();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSound();
    return () => {
      unloadSound();
    };
  }, [voiceMessage.url]);

  useEffect(() => {
    if (autoPlay && isLoaded && !isPlaying) {
      togglePlayPause();
    }
  }, [autoPlay, isLoaded, isPlaying]);

  const loadSound = async () => {
    try {
      setIsLoading(true);
      const { sound } = await Audio.Sound.createAsync(
        { uri: voiceMessage.url },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      setSound(sound);
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading sound:', error);
      Alert.alert('Error', 'Failed to load voice message');
    } finally {
      setIsLoading(false);
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
        onPause?.();
        
        // Mark as played
        markAsPlayed();
      }
    }
  };

  const togglePlayPause = async () => {
    if (!sound || !isLoaded) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
        onPause?.();
      } else {
        if (position >= voiceMessage.duration) {
          await sound.setPositionAsync(0);
          setPosition(0);
        }
        await sound.playAsync();
        setIsPlaying(true);
        onPlay?.();

        // Animate progress bar
        const remainingTime = (voiceMessage.duration - position) * 1000;
        Animated.timing(progress, {
          toValue: 1,
          duration: remainingTime,
          useNativeDriver: false,
        }).start();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const handleSeek = async (newPosition: number) => {
    if (!sound || !isLoaded) return;
    
    try {
      await sound.setPositionAsync(newPosition * 1000);
      setPosition(newPosition);
      const progressValue = newPosition / voiceMessage.duration;
      progress.setValue(progressValue);
      onSeek?.(newPosition);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const markAsPlayed = async () => {
    try {
      await voiceMessagesAPI.markAsPlayed(voiceMessage._id);
    } catch (error) {
      console.error('Error marking as played:', error);
    }
  };

  const requestTranscription = async () => {
    if (transcription || isTranscribing) return;

    try {
      setIsTranscribing(true);
      const response = await voiceMessagesAPI.transcribeVoiceMessage(voiceMessage._id);
      
      if (response.success) {
        setTranscription(response.transcription);
      } else {
        throw new Error(response.message || 'Transcription failed');
      }
    } catch (error) {
      console.error('Error requesting transcription:', error);
      Alert.alert('Error', 'Failed to transcribe voice message');
    } finally {
      setIsTranscribing(false);
    }
  };

  const getTranscriptionText = () => {
    if (!transcription) return '';
    
    if (showFullTranscription || transcription.text.length <= 100) {
      return transcription.text;
    }
    
    return transcription.text.substring(0, 100) + '...';
  };

  const renderTranscription = () => {
    if (!showTranscription) return null;

    return (
      <View style={styles.transcriptionContainer}>
        <View style={styles.transcriptionHeader}>
          <Text style={[styles.transcriptionLabel, { color: theme.colors.textSecondary }]}>
            Transcription
          </Text>
          {transcription && (
            <Text style={[styles.confidenceText, { color: theme.colors.textSecondary }]}>
              {Math.round(transcription.confidence * 100)}% confidence
            </Text>
          )}
        </View>

        {transcription ? (
          <View style={styles.transcriptionContent}>
            <Text style={[styles.transcriptionText, { color: theme.colors.text }]}>
              {getTranscriptionText()}
            </Text>
            {transcription.text.length > 100 && (
              <TouchableOpacity
                onPress={() => setShowFullTranscription(!showFullTranscription)}
                style={styles.showMoreButton}
              >
                <Text style={[styles.showMoreText, { color: theme.colors.primary }]}>
                  {showFullTranscription ? 'Show less' : 'Show more'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity
            onPress={requestTranscription}
            disabled={isTranscribing}
            style={styles.transcribeButton}
          >
            {isTranscribing ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Ionicons name="text" size={16} color={theme.colors.primary} />
            )}
            <Text style={[styles.transcribeText, { color: theme.colors.primary }]}>
              {isTranscribing ? 'Transcribing...' : 'Get transcription'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderStatusIndicator = () => {
    const getStatusColor = () => {
      switch (voiceMessage.status) {
        case 'sending':
          return theme.colors.warning;
        case 'sent':
          return theme.colors.textSecondary;
        case 'delivered':
          return theme.colors.primary;
        case 'played':
          return theme.colors.primary;
        default:
          return theme.colors.textSecondary;
      }
    };

    const getStatusIcon = () => {
      switch (voiceMessage.status) {
        case 'sending':
          return 'time';
        case 'sent':
          return 'checkmark';
        case 'delivered':
          return 'checkmark-done';
        case 'played':
          return 'checkmark-done';
        default:
          return 'checkmark';
      }
    };

    return (
      <View style={styles.statusContainer}>
        <Ionicons
          name={getStatusIcon() as any}
          size={12}
          color={getStatusColor()}
        />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.playerContainer}>
        <TouchableOpacity
          onPress={togglePlayPause}
          disabled={!isLoaded || isLoading}
          style={[
            styles.playButton,
            { backgroundColor: theme.colors.primary },
            (!isLoaded || isLoading) && styles.disabledButton,
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={20}
              color="white"
            />
          )}
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.waveformContainer}>
            <WaveformVisualizer
              waveform={voiceMessage.waveform}
              duration={voiceMessage.duration}
              currentPosition={position}
              isPlaying={isPlaying}
              onSeek={handleSeek}
              height={40}
              color={theme.colors.primary}
              backgroundColor={theme.colors.disabled}
            />
          </View>

          <View style={styles.timeContainer}>
            <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
              {formatDuration(position)}
            </Text>
            <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
              {formatDuration(voiceMessage.duration)}
            </Text>
          </View>
        </View>

        {renderStatusIndicator()}
      </View>

      {renderTranscription()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
  },
  playerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
  },
  waveformContainer: {
    marginBottom: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 12,
  },
  statusContainer: {
    marginLeft: 8,
  },
  transcriptionContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  transcriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transcriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  confidenceText: {
    fontSize: 10,
  },
  transcriptionContent: {
    marginBottom: 4,
  },
  transcriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  showMoreButton: {
    marginTop: 4,
  },
  showMoreText: {
    fontSize: 12,
    fontWeight: '500',
  },
  transcribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  transcribeText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '500',
  },
});
