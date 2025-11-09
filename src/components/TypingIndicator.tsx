import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';

interface TypingIndicatorProps {
  users: string[];
  visible: boolean;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users, visible }) => {
  const dotRefs = useRef<(Animatable.View | null)[]>([]);

  useEffect(() => {
    if (visible) {
      // Start bouncing animation for dots
      dotRefs.current.forEach((dot, index) => {
        setTimeout(() => {
          dot?.animate({
            0: { transform: [{ translateY: 0 }] },
            0.5: { transform: [{ translateY: -8 }] },
            1: { transform: [{ translateY: 0 }] },
          }, 1000, 'ease-in-out', true);
        }, index * 200);
      });
    }
  }, [visible]);

  if (!visible || users.length === 0) {
    return null;
  }

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0]} is typing`;
    } else if (users.length === 2) {
      return `${users[0]} and ${users[1]} are typing`;
    } else {
      return `${users[0]} and ${users.length - 1} others are typing`;
    }
  };

  return (
    <Animatable.View
      animation="fadeInUp"
      duration={300}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.text}>{getTypingText()}</Text>
        <View style={styles.dotsContainer}>
          {[0, 1, 2].map((index) => (
            <Animatable.View
              key={index}
              ref={(ref) => (dotRefs.current[index] = ref)}
              style={styles.dot}
            />
          ))}
        </View>
      </View>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginRight: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#666',
    marginHorizontal: 1,
  },
});

export default TypingIndicator;
