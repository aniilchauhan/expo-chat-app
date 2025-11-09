import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { IconButton, Avatar, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChatMessage from './ChatMessage';
import { Chat, Message, User } from '../types';
import { sendMessage, getMessages, editMessage, deleteMessage } from '../api';

interface ChatRoomProps {
  chat: Chat;
  currentUser: User | null;
  onBack: () => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({
  chat,
  currentUser,
  onBack,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const isPrivate = chat.type === 'private';
  const otherParticipant = isPrivate 
    ? chat.participants?.find(p => p.userId._id !== currentUser?.id)
    : null;
  
  const chatName = chat.name || 
    (otherParticipant ? `${otherParticipant.userId.firstName} ${otherParticipant.userId.lastName}` : 'Private Chat');

  useEffect(() => {
    loadMessages();
  }, [chat._id]);

  const loadMessages = async () => {
    try {
      const response = await getMessages(chat._id);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageData = {
      content: newMessage.trim(),
      messageType: 'text',
      senderId: currentUser?.id || '',
      replyTo: replyingTo?._id,
    };

    try {
      setIsLoading(true);
      
      if (editingMessage) {
        await editMessage(editingMessage._id, messageData.content);
        setEditingMessage(null);
      } else {
        await sendMessage(chat._id, messageData);
      }
      
      setNewMessage('');
      setReplyingTo(null);
      await loadMessages();
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    setEditingMessage(null);
  };

  const handleEdit = (message: Message) => {
    setEditingMessage(message);
    setNewMessage(message.content);
    setReplyingTo(null);
  };

  const handleDelete = async (messageId: string) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMessage(messageId);
              await loadMessages();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete message');
            }
          },
        },
      ]
    );
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setNewMessage('');
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <ChatMessage
      message={item}
      currentUser={currentUser}
      onReply={handleReply}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        
        <Avatar.Text
          size={40}
          label={isPrivate 
            ? (otherParticipant?.userId.firstName?.[0] || '') + (otherParticipant?.userId.lastName?.[0] || '')
            : chat.name?.[0] || 'G'
          }
        />
        
        <View style={styles.headerInfo}>
          <Text style={styles.chatTitle} numberOfLines={1}>
            {chatName}
          </Text>
          {isPrivate && otherParticipant && (
            <Text style={styles.chatSubtitle}>
              {otherParticipant.isOnline ? 'Online' : 'Offline'}
            </Text>
          )}
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Reply/Edit indicator */}
      {(replyingTo || editingMessage) && (
        <View style={styles.replyContainer}>
          <View style={styles.replyContent}>
            <Text style={styles.replyLabel}>
              {editingMessage ? 'Editing message' : `Replying to ${replyingTo?.sender.firstName}`}
            </Text>
            <Text style={styles.replyText} numberOfLines={2}>
              {editingMessage ? editingMessage.content : replyingTo?.content}
            </Text>
          </View>
          <TouchableOpacity
            onPress={editingMessage ? cancelEdit : cancelReply}
            style={styles.cancelButton}
          >
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      )}

      {/* Message Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || isLoading}
            style={[styles.sendButton, (!newMessage.trim() || isLoading) && styles.sendButtonDisabled]}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={(!newMessage.trim() || isLoading) ? '#ccc' : '#2196f3'} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  chatSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 8,
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  replyContent: {
    flex: 1,
  },
  replyLabel: {
    fontSize: 12,
    color: '#2196f3',
    fontWeight: '500',
  },
  replyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  cancelButton: {
    padding: 4,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 8,
    padding: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default ChatRoom;