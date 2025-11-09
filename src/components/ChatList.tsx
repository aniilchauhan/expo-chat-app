import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Avatar, Card } from 'react-native-paper';
import { formatDistanceToNow } from 'date-fns';
import { Chat, User } from '../types';

interface ChatListProps {
  chats: Chat[];
  currentUser: User | null;
  onChatSelect: (chat: Chat) => void;
  selectedChatId?: string;
}

const ChatList: React.FC<ChatListProps> = ({
  chats,
  currentUser,
  onChatSelect,
  selectedChatId,
}) => {
  const renderChatItem = ({ item }: { item: Chat }) => {
    const isPrivate = item.type === 'private';
    const otherParticipant = isPrivate 
      ? item.participants?.find(p => p.userId._id !== currentUser?.id)
      : null;
    
    const chatName = item.name || 
      (otherParticipant ? `${otherParticipant.userId.firstName} ${otherParticipant.userId.lastName}` : 'Private Chat');

    const isSelected = selectedChatId === item._id;

    return (
      <TouchableOpacity
        style={[styles.chatItem, isSelected && styles.selectedChatItem]}
        onPress={() => onChatSelect(item)}
      >
        <Avatar.Text
          size={50}
          label={isPrivate 
            ? (otherParticipant?.userId.firstName?.[0] || '') + (otherParticipant?.userId.lastName?.[0] || '')
            : item.name?.[0] || 'G'
          }
        />
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>
              {chatName}
            </Text>
            {item.lastMessage && (
              <Text style={styles.timestamp}>
                {formatDistanceToNow(new Date(item.lastMessage.createdAt), { addSuffix: true })}
              </Text>
            )}
          </View>
          <Text style={styles.lastMessage} numberOfLines={2}>
            {item.lastMessage?.content || 'No messages yet'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedChatItem: {
    backgroundColor: '#e3f2fd',
  },
  chatInfo: {
    marginLeft: 12,
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
});

export default ChatList;