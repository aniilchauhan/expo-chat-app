import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../../theme';
import { formatDuration } from '../../utils/time';

interface VoiceRecorderProps {
  onRecordingComplete: (voiceMessage: any) => void;
}

export function VoiceRecorder({ onRecordingComplete }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const recording = useRef<Audio.Recording | null>(null);
  const animation = useRef(new Animated.Value(1)).current;
  const startTime = useRef<number>(0);
  const timerInterval = useRef<number>();

  const { theme } = useTheme();

  useEffect(() => {
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      recording.current = new Audio.Recording();
      await recording.current.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await recording.current.startAsync();

      startTime.current = Date.now();
      setIsRecording(true);

      // Start pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(animation, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(animation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Start duration timer
      timerInterval.current = setInterval(() => {
        setDuration((Date.now() - startTime.current) / 1000);
      }, 100);
    } catch (error) {
      console.error('Failed to start recording', error);
    }
  };

  const stopRecording = async () => {
    if (!recording.current) return;

    try {
      await recording.current.stopAndUnloadAsync();
      clearInterval(timerInterval.current);
      animation.setValue(1);

      const uri = recording.current.getURI();
      setRecordingUri(uri);
      setIsRecording(false);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
    } catch (error) {
      console.error('Failed to stop recording', error);
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
    clearInterval(timerInterval.current);
    animation.setValue(1);
  };

  const sendRecording = async () => {
    if (!recordingUri) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('audio', {
        uri: recordingUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      formData.append('duration', duration.toString());

      const response = await fetch('/api/voice-messages/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      onRecordingComplete(data.voiceMessage);

      // Clean up
      await FileSystem.deleteAsync(recordingUri);
      setRecordingUri(null);
      setDuration(0);
    } catch (error) {
      console.error('Error uploading voice message:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {!isRecording && !recordingUri ? (
        <TouchableOpacity
          onPress={startRecording}
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
        >
          <MaterialIcons name="mic" size={24} color="white" />
        </TouchableOpacity>
      ) : (
        <View style={styles.recordingContainer}>
          {isRecording ? (
            <>
              <View style={styles.durationContainer}>
                <Animated.View
                  style={[
                    styles.recordingIndicator,
                    {
                      backgroundColor: theme.colors.error,
                      transform: [{ scale: animation }],
                    },
                  ]}
                />
                <Text style={styles.durationText}>
                  {formatDuration(duration)}
                </Text>
              </View>

              <TouchableOpacity
                onPress={stopRecording}
                style={[
                  styles.button,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <MaterialIcons name="stop" size={24} color="white" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.durationText}>
                {formatDuration(duration)}
              </Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={sendRecording}
                  disabled={isUploading}
                  style={[
                    styles.button,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <MaterialIcons name="send" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={cancelRecording}
                  disabled={isUploading}
                  style={[
                    styles.button,
                    { backgroundColor: theme.colors.error },
                  ]}
                >
                  <MaterialIcons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  durationText: {
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
});
