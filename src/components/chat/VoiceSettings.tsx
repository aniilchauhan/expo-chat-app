import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface VoiceSettingsProps {
  isVisible: boolean;
  onClose: () => void;
}

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({
  isVisible,
  onClose,
}) => {
  const { theme } = useTheme();
  const [autoTranscribe, setAutoTranscribe] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showWaveform, setShowWaveform] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);

  if (!isVisible) return null;

  const handlePlaybackSpeedChange = () => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIndex]);
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all voice message settings to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setAutoTranscribe(true);
            setPlaybackSpeed(1.0);
            setShowWaveform(true);
            setAutoPlay(false);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Voice Message Settings
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Playback
          </Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                Auto-transcribe messages
              </Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                Automatically transcribe voice messages for better accessibility
              </Text>
            </View>
            <Switch
              value={autoTranscribe}
              onValueChange={setAutoTranscribe}
              trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
              thumbColor={autoTranscribe ? '#fff' : theme.colors.textSecondary}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                Show waveform
              </Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                Display visual waveform for voice messages
              </Text>
            </View>
            <Switch
              value={showWaveform}
              onValueChange={setShowWaveform}
              trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
              thumbColor={showWaveform ? '#fff' : theme.colors.textSecondary}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                Auto-play voice messages
              </Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                Automatically play voice messages when opened
              </Text>
            </View>
            <Switch
              value={autoPlay}
              onValueChange={setAutoPlay}
              trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
              thumbColor={autoPlay ? '#fff' : theme.colors.textSecondary}
            />
          </View>

          <TouchableOpacity
            style={[styles.playbackSpeedButton, { borderColor: theme.colors.primary }]}
            onPress={handlePlaybackSpeedChange}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                Playback Speed
              </Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                Current: {playbackSpeed}x
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Recording
          </Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                High Quality Recording
              </Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                Record voice messages in high quality (uses more storage)
              </Text>
            </View>
            <Switch
              value={true} // Always high quality for now
              disabled={true}
              trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.resetButton, { borderColor: theme.colors.error }]}
            onPress={handleResetSettings}
          >
            <Text style={[styles.resetButtonText, { color: theme.colors.error }]}>
              Reset to Defaults
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  playbackSpeedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 8,
  },
  actions: {
    marginTop: 'auto',
    paddingTop: 16,
  },
  resetButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
