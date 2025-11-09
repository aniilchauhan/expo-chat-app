import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../theme';

interface WaveformVisualizerProps {
  waveform: number[];
  duration: number;
  currentPosition: number;
  isPlaying: boolean;
  onSeek?: (position: number) => void;
  height?: number;
  color?: string;
  backgroundColor?: string;
  showSeekIndicator?: boolean;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  waveform,
  duration,
  currentPosition,
  isPlaying,
  onSeek,
  height = 40,
  color,
  backgroundColor,
  showSeekIndicator = true,
}) => {
  const { theme } = useTheme();
  const animatedValues = useRef<Animated.Value[]>([]);
  const seekIndicator = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get('window').width;
  const waveformWidth = screenWidth - 100; // Account for padding and controls

  // Initialize animated values for each bar
  useEffect(() => {
    animatedValues.current = waveform.map(() => new Animated.Value(0));
  }, [waveform]);

  // Animate bars based on current position
  useEffect(() => {
    const progress = currentPosition / duration;
    const activeIndex = Math.floor(progress * waveform.length);

    animatedValues.current.forEach((animatedValue, index) => {
      const isActive = index <= activeIndex;
      const targetValue = isActive ? 1 : 0;
      
      Animated.timing(animatedValue, {
        toValue: targetValue,
        duration: 100,
        useNativeDriver: false,
      }).start();
    });

    // Update seek indicator position
    if (showSeekIndicator) {
      Animated.timing(seekIndicator, {
        toValue: progress * waveformWidth,
        duration: 100,
        useNativeDriver: false,
      }).start();
    }
  }, [currentPosition, duration, waveform.length, waveformWidth, showSeekIndicator]);

  // Pulse animation for playing state
  useEffect(() => {
    if (isPlaying) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValues.current[Math.floor(currentPosition / duration * waveform.length)] || new Animated.Value(0), {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: false,
          }),
          Animated.timing(animatedValues.current[Math.floor(currentPosition / duration * waveform.length)] || new Animated.Value(0), {
            toValue: 1,
            duration: 500,
            useNativeDriver: false,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [isPlaying, currentPosition, duration, waveform.length]);

  const handleSeek = (event: any) => {
    if (!onSeek) return;
    
    const { locationX } = event.nativeEvent;
    const progress = locationX / waveformWidth;
    const newPosition = Math.max(0, Math.min(1, progress)) * duration;
    onSeek(newPosition);
  };

  const barWidth = Math.max(1, waveformWidth / waveform.length - 1);
  const barColor = color || theme.colors.primary;
  const bgColor = backgroundColor || theme.colors.disabled;

  return (
    <View style={[styles.container, { height }]}>
      <TouchableOpacity
        style={styles.waveformContainer}
        onPress={handleSeek}
        activeOpacity={0.7}
        disabled={!onSeek}
      >
        {waveform.map((amplitude, index) => (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                width: barWidth,
                height: Math.max(2, amplitude * (height - 4)),
                backgroundColor: animatedValues.current[index]?.interpolate({
                  inputRange: [0, 1],
                  outputRange: [bgColor, barColor],
                }) || bgColor,
              },
            ]}
          />
        ))}
        
        {showSeekIndicator && (
          <Animated.View
            style={[
              styles.seekIndicator,
              {
                left: seekIndicator,
                backgroundColor: barColor,
              },
            ]}
          />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 2,
  },
  bar: {
    borderRadius: 1,
    marginHorizontal: 0.5,
  },
  seekIndicator: {
    position: 'absolute',
    width: 2,
    height: '100%',
    borderRadius: 1,
    opacity: 0.8,
  },
});
