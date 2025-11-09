import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Avatar, Menu } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { formatDistanceToNow } from 'date-fns';
import { Message, User } from '../types';

interface ChatMessageProps {
  message: Message;
  currentUser: User | null;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  currentUser,
  onReply,
  onEdit,
  onDelete,
}) => {
  const [menuVisible, setMenuVisible] = React.useState(false);
  const isOwn = message.sender._id === currentUser?.id;

  const handleMenuPress = () => {
    setMenuVisible(true);
  };

  const handleReply = () => {
    setMenuVisible(false);
    onReply?.(message);
  };

  const handleEdit = () => {
    setMenuVisible(false);
    onEdit?.(message);
  };

  const handleDelete = () => {
    setMenuVisible(false);
    onDelete?.(message._id);
  };

  return (
    <Animatable.View 
      animation="fadeInUp" 
      duration={300}
      style={[styles.container, isOwn ? styles.ownMessage : styles.otherMessage]}
    >
      {!isOwn && (
        <Animatable.View animation="fadeIn" delay={100} style={styles.messageHeader}>
          <Avatar.Text
            size={30}
            label={(message.sender.firstName?.[0] || '') + (message.sender.lastName?.[0] || '')}
          />
          <Text style={styles.senderName}>{message.sender.firstName}</Text>
        </Animatable.View>
      )}
      
      <View style={styles.messageContent}>
        {message.replyTo && (
          <Animatable.View animation="slideInLeft" duration={200} style={styles.replyContainer}>
            <Text style={styles.replyLabel}>Replying to:</Text>
            <Text style={styles.replyText} numberOfLines={2}>
              {message.replyTo.content}
            </Text>
          </Animatable.View>
        )}
        
        <Animatable.View 
          animation={isOwn ? "slideInRight" : "slideInLeft"} 
          duration={250}
          style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}
        >
          <Text style={[styles.messageText, isOwn ? styles.ownMessageText : styles.otherMessageText]}>
            {message.content}
          </Text>
          {message.isEdited && (
            <Animatable.Text animation="fadeIn" style={styles.editedLabel}>(edited)</Animatable.Text>
          )}
          
          <View style={styles.messageFooter}>
            <Text style={styles.timestamp}>
              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
            </Text>
            
            {isOwn && (
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
                    <Ionicons name="ellipsis-horizontal" size={16} color={isOwn ? '#fff' : '#666'} />
                  </TouchableOpacity>
                }
              >
                <Menu.Item onPress={handleReply} title="Reply" />
                <Menu.Item onPress={handleEdit} title="Edit" />
                <Menu.Item onPress={handleDelete} title="Delete" />
              </Menu>
            )}
          </View>
        </Animatable.View>
      </View>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  messageContent: {
    maxWidth: '80%',
  },
  replyContainer: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#2196f3',
  },
  replyLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  replyText: {
    fontSize: 14,
    color: '#333',
    marginTop: 2,
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    position: 'relative',
  },
  ownBubble: {
    backgroundColor: '#2196f3',
  },
  otherBubble: {
    backgroundColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#000',
  },
  editedLabel: {
    fontSize: 12,
    opacity: 0.7,
    fontStyle: 'italic',
    marginTop: 2,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.7,
  },
  menuButton: {
    padding: 4,
  },
});

export default ChatMessage;