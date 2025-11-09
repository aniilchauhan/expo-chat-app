import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Text,
  FlatList,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Common emoji reactions
const commonEmojis = [
  '👍', '❤️', '😂', '😮', '😢', '😡',
  '🎉', '👏', '🙏', '🔥', '❤️‍🔥', '💯'
];

interface ReactionPickerProps {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  isVisible,
  onClose,
  onSelect,
}) => {
  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    onClose();
  };

  const renderItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.emojiButton}
      onPress={() => handleSelect(item)}
    >
      <Text style={styles.emoji}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container}>
          <FlatList
            data={commonEmojis}
            renderItem={renderItem}
            keyExtractor={(item) => item}
            numColumns={6}
            style={styles.grid}
            contentContainerStyle={styles.gridContent}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: 300,
  },
  grid: {
    flex: 1,
  },
  gridContent: {
    padding: 8,
  },
  emojiButton: {
    width: (width - 32 - 48) / 6,
    height: (width - 32 - 48) / 6,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  emoji: {
    fontSize: 24,
  },
});
