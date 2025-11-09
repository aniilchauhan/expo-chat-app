import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Message } from './Message';
import { theme } from '../../theme';
import { threadsAPI } from '../../api';

interface ThreadViewProps {
  thread: {
    _id: string;
    originalMessage: any;
    participants: any[];
    messageCount: number;
    lastActivity: string;
  };
  currentUser: any;
  onBack: () => void;
}

export const ThreadView: React.FC<ThreadViewProps> = ({
  thread,
  currentUser,
  onBack,
}) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
    // Add socket connection here
  }, [thread._id]);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const response = await threadsAPI.getThreadMessages(thread._id);
      if (response.success) {
        setMessages(response.messages || []);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Failed to load thread messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewThreadMessage = (data: any) => {
    if (data.threadId === thread._id) {
      setMessages(prev => [...prev, data.message]);
      scrollToBottom();
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await threadsAPI.sendThreadMessage(thread._id, newMessage.trim());
      if (response.success) {
        setNewMessage('');
        // The message will be added via socket event
      }
    } catch (error) {
      console.error('Failed to send thread message:', error);
    }
  };

  const renderMessage = ({ item }: { item: any }) => (
    <Message message={item} currentUserId={currentUser.id} />
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Thread</Text>
          <Text style={styles.subtitle}>
            {thread.messageCount} replies · Last activity{' '}
            {format(new Date(thread.lastActivity), 'PP')}
          </Text>
        </View>
      </View>

      {/* Original Message */}
      <View style={styles.originalMessage}>
        <Message
          message={thread.originalMessage}
          currentUserId={currentUser.id}
        />
      </View>

      {/* Thread Messages */}
      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={theme.colors.primary} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.messageList}
        />
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Reply in thread..."
          placeholderTextColor={theme.colors.textSecondary}
          multiline
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!newMessage.trim()}
          style={[
            styles.sendButton,
            !newMessage.trim() && styles.sendButtonDisabled,
          ]}
        >
          <MaterialIcons
            name="send"
            size={24}
            color={newMessage.trim() ? theme.colors.white : theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.backgroundSecondary,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  originalMessage: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.backgroundSecondary,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.backgroundSecondary,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    marginRight: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    color: theme.colors.textPrimary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
});
