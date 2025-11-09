import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import type { AlertButton } from 'react-native';
import { format } from 'date-fns';
import { ReactionPicker } from './ReactionPicker';
import { MessageReactions } from './MessageReactions';
import { reactionsApi } from '../../api/reactions';
import { theme } from '../../theme';

interface MessageProps {
  message: {
    _id: string;
    content: string;
    senderId: {
      _id: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
    reactions: Array<{
      _id: string;
      emoji: string;
      userId: {
        _id: string;
        firstName: string;
        lastName: string;
        username: string;
      };
    }>;
    createdAt: string;
    isDeleted?: boolean;
  };
  currentUserId: string;
  onReply?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string) => void;
}

export const Message: React.FC<MessageProps> = ({
  message,
  currentUserId,
  onReply,
  onDelete,
  onEdit,
}) => {
  const [isReactionPickerVisible, setReactionPickerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isOwn = message.senderId._id === currentUserId;

  const handleLongPress = () => {
    setReactionPickerVisible(true);
  };

  const handleReactionSelect = async (emoji: string) => {
    try {
      setIsLoading(true);
      await reactionsApi.addReaction(message._id, emoji);
    } catch (error) {
      Alert.alert('Error', 'Failed to add reaction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactionPress = async (emoji: string) => {
    try {
      setIsLoading(true);
      const hasReacted = message.reactions.some(
        (r) => r.userId._id === currentUserId && r.emoji === emoji
      );
      if (hasReacted) {
        await reactionsApi.removeReaction(message._id);
      } else {
        await reactionsApi.addReaction(message._id, emoji);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to handle reaction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMorePress = () => {
    const buttons: AlertButton[] = [
      {
        text: 'Reply',
        onPress: () => onReply?.(message._id),
      },
      ...(
        isOwn
          ? [
              {
                text: 'Edit',
                onPress: () => onEdit?.(message._id),
              },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => onDelete?.(message._id),
              },
            ] as AlertButton[]
          : []
      ),
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ];

    Alert.alert('Message Options', undefined, buttons, { cancelable: true });
  };

  return (
    <View style={[styles.container, isOwn && styles.ownContainer]}>
      {message.senderId.avatar ? (
        <Image
          source={{ uri: message.senderId.avatar }}
          style={styles.avatar}
        />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Ionicons name="person" size={18} color={theme.colors.textSecondary} />
        </View>
      )}
      <View style={[styles.contentContainer, isOwn && styles.ownContentContainer]}>
        <View style={styles.header}>
          <Text style={styles.name}>
            {message.senderId.firstName} {message.senderId.lastName}
          </Text>
          <Text style={styles.time}>
            {format(new Date(message.createdAt), 'p')}
          </Text>
        </View>
        <TouchableOpacity
          onLongPress={handleLongPress}
          delayLongPress={200}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.bubble,
              isOwn ? styles.ownBubble : styles.otherBubble,
            ]}
          >
            {message.isDeleted ? (
              <Text style={styles.deletedText}>This message was deleted</Text>
            ) : (
              <Text style={[styles.content, isOwn && styles.ownContent]}>
                {message.content}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        {message.reactions.length > 0 && (
          <MessageReactions
            reactions={message.reactions}
            onReactionPress={handleReactionPress}
            style={styles.reactions}
          />
        )}
      </View>
      {!message.isDeleted && (
        <TouchableOpacity
          style={styles.moreButton}
          onPress={handleMorePress}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <MaterialIcons
            name="more-vert"
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      )}
      <ReactionPicker
        isVisible={isReactionPickerVisible}
        onClose={() => setReactionPickerVisible(false)}
        onSelect={handleReactionSelect}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  ownContainer: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  contentContainer: {
    flex: 1,
    maxWidth: '75%',
  },
  ownContentContainer: {
    alignItems: 'flex-end',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  time: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  bubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '100%',
  },
  otherBubble: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderTopLeftRadius: 4,
  },
  ownBubble: {
    backgroundColor: theme.colors.primary,
    borderTopRightRadius: 4,
  },
  content: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  ownContent: {
    color: theme.colors.white,
  },
  deletedText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: theme.colors.textSecondary,
  },
  reactions: {
    marginTop: 4,
  },
  moreButton: {
    alignSelf: 'flex-start',
    padding: 4,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
  },
});
