import React, { useState, useRef, useEffect } from 'react';
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
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../../theme';
import { formatDuration } from '../../utils/time';
import { WaveformVisualizer } from './WaveformVisualizer';
import { voiceMessagesAPI } from '../../api';

interface EnhancedVoiceRecorderProps {
  chatId: string;
  onRecordingComplete: (voiceMessage: any) => void;
  onCancel?: () => void;
}

export const EnhancedVoiceRecorder: React.FC<EnhancedVoiceRecorderProps> = ({
  chatId,
  onRecordingComplete,
  onCancel,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [recordingLevel, setRecordingLevel] = useState(0);

  const recording = useRef<Audio.Recording | null>(null);
  const animation = useRef(new Animated.Value(1)).current;
  const startTime = useRef<number>(0);
  const timerInterval = useRef<NodeJS.Timeout>();
  const levelInterval = useRef<NodeJS.Timeout>();

  const { theme } = useTheme();

  useEffect(() => {
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
      if (levelInterval.current) {
        clearInterval(levelInterval.current);
      }
    };
  }, []);

  const generateMockWaveform = (duration: number): number[] => {
    const samples = Math.min(100, Math.max(20, Math.floor(duration * 2)));
    const waveform: number[] = [];
    
    for (let i = 0; i < samples; i++) {
      // Generate realistic waveform data with some randomness
      const baseAmplitude = 0.3 + Math.random() * 0.4;
      const variation = Math.sin(i * 0.5) * 0.2;
      const randomNoise = (Math.random() - 0.5) * 0.1;
      const amplitude = Math.max(0.1, Math.min(1, baseAmplitude + variation + randomNoise));
      waveform.push(amplitude);
    }
    
    return waveform;
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      recording.current = new Audio.Recording();
      await recording.current.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      await recording.current.startAsync();
      startTime.current = Date.now();
      setIsRecording(true);

      // Start pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(animation, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(animation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Start duration timer
      timerInterval.current = setInterval(() => {
        const elapsed = (Date.now() - startTime.current) / 1000;
        setDuration(elapsed);
        setWaveform(generateMockWaveform(elapsed));
      }, 100);

      // Simulate recording level monitoring
      levelInterval.current = setInterval(() => {
        setRecordingLevel(0.3 + Math.random() * 0.7);
      }, 50);

    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = async () => {
    if (!recording.current) return;

    try {
      await recording.current.stopAndUnloadAsync();
      clearInterval(timerInterval.current);
      clearInterval(levelInterval.current);
      animation.setValue(1);

      const uri = recording.current.getURI();
      setRecordingUri(uri);
      setIsRecording(false);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const cancelRecording = async () => {
    if (recording.current) {
      try {
        await recording.current.stopAndUnloadAsync();
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
    }

    if (recordingUri) {
      try {
        await FileSystem.deleteAsync(recordingUri);
      } catch (error) {
        console.error('Error deleting recording:', error);
      }
    }

    setIsRecording(false);
    setDuration(0);
    setRecordingUri(null);
    setWaveform([]);
    setRecordingLevel(0);
    clearInterval(timerInterval.current);
    clearInterval(levelInterval.current);
    animation.setValue(1);
    onCancel?.();
  };

  const sendRecording = async () => {
    if (!recordingUri) return;

    setIsUploading(true);
    setIsProcessing(true);
    
    try {
      const audioFile = {
        uri: recordingUri,
        type: 'audio/m4a',
        name: `voice_message_${Date.now()}.m4a`,
      } as any;

      const response = await voiceMessagesAPI.uploadVoiceMessage(chatId, audioFile, duration);
      
      if (response.success) {
        onRecordingComplete(response.voiceMessage);
        
        // Clean up
        await FileSystem.deleteAsync(recordingUri);
        setRecordingUri(null);
        setDuration(0);
        setWaveform([]);
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading voice message:', error);
      Alert.alert('Error', 'Failed to send voice message. Please try again.');
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  const renderRecordingState = () => (
    <View style={styles.recordingContainer}>
      <View style={styles.recordingInfo}>
        <Animated.View
          style={[
            styles.recordingIndicator,
            {
              backgroundColor: theme.colors.error,
              transform: [{ scale: animation }],
            },
          ]}
        />
        <Text style={[styles.durationText, { color: theme.colors.text }]}>
          {formatDuration(duration)}
        </Text>
      </View>

      <View style={styles.waveformContainer}>
        <WaveformVisualizer
          waveform={waveform}
          duration={duration}
          currentPosition={duration}
          isPlaying={false}
          height={50}
          color={theme.colors.primary}
          backgroundColor={theme.colors.disabled}
          showSeekIndicator={false}
        />
        <View style={styles.recordingLevelContainer}>
          <View
            style={[
              styles.recordingLevel,
              {
                height: recordingLevel * 20,
                backgroundColor: theme.colors.error,
              },
            ]}
          />
        </View>
      </View>

      <TouchableOpacity
        onPress={stopRecording}
        style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
      >
        <Ionicons name="stop" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );

  const renderPlaybackState = () => (
    <View style={styles.playbackContainer}>
      <View style={styles.playbackInfo}>
        <Text style={[styles.durationText, { color: theme.colors.text }]}>
          {formatDuration(duration)}
        </Text>
        <Text style={[styles.recordingLabel, { color: theme.colors.textSecondary }]}>
          Voice Message
        </Text>
      </View>

      <View style={styles.waveformContainer}>
        <WaveformVisualizer
          waveform={waveform}
          duration={duration}
          currentPosition={0}
          isPlaying={false}
          height={50}
          color={theme.colors.primary}
          backgroundColor={theme.colors.disabled}
          showSeekIndicator={false}
        />
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          onPress={sendRecording}
          disabled={isUploading}
          style={[
            styles.actionButton,
            { backgroundColor: theme.colors.primary },
            isUploading && styles.disabledButton,
          ]}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="send" size={20} color="white" />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={cancelRecording}
          disabled={isUploading}
          style={[
            styles.actionButton,
            { backgroundColor: theme.colors.error },
            isUploading && styles.disabledButton,
          ]}
        >
          <Ionicons name="close" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInitialState = () => (
    <View style={styles.initialContainer}>
      <TouchableOpacity
        onPress={startRecording}
        style={[styles.recordButton, { backgroundColor: theme.colors.primary }]}
      >
        <Ionicons name="mic" size={28} color="white" />
      </TouchableOpacity>
      <Text style={[styles.recordLabel, { color: theme.colors.textSecondary }]}>
        Tap to record voice message
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {!isRecording && !recordingUri && renderInitialState()}
      {isRecording && renderRecordingState()}
      {recordingUri && !isRecording && renderPlaybackState()}
      
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.processingText, { color: theme.colors.text }]}>
            Processing voice message...
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    margin: 8,
  },
  initialContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  recordButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  recordLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  durationText: {
    fontSize: 16,
    fontWeight: '600',
  },
  waveformContainer: {
    flex: 1,
    marginHorizontal: 16,
    position: 'relative',
  },
  recordingLevelContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingLevel: {
    width: 4,
    borderRadius: 2,
    minHeight: 4,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  playbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playbackInfo: {
    minWidth: 80,
  },
  recordingLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    marginTop: 12,
    fontSize: 14,
  },
});
