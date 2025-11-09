import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Reaction {
  _id: string;
  emoji: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
}

interface MessageReactionsProps {
  reactions: Reaction[];
  onReactionPress?: (emoji: string) => void;
  style?: any;
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  onReactionPress,
  style,
}) => {
  // Group reactions by emoji
  const reactionGroups = reactions.reduce((acc, reaction) => {
    const { emoji } = reaction;
    if (!acc[emoji]) {
      acc[emoji] = [];
    }
    acc[emoji].push(reaction);
    return acc;
  }, {} as Record<string, Reaction[]>);

  return (
    <View style={[styles.container, style]}>
      {Object.entries(reactionGroups).map(([emoji, reactions]) => (
        <TouchableOpacity
          key={emoji}
          style={styles.reaction}
          onPress={() => onReactionPress?.(emoji)}
        >
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.count}>{reactions.length}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  emoji: {
    fontSize: 14,
  },
  count: {
    fontSize: 12,
    color: '#666',
  },
});
