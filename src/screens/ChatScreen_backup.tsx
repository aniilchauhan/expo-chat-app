import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { Appbar, Avatar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useMobile } from '../hooks/useMobile';
import { chatsAPI, messagesAPI, usersAPI } from '../api';
import { Chat, Message, User } from '../types';
import { io, Socket } from 'socket.io-client';

const { width } = Dimensions.get('window');

interface ChatScreenProps {
  onBackToChats: () => void;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ onBackToChats }) => {
  const { user } = useAuth();
  const isMobile = useMobile();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isTyping, setIsTyping] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const messagesEndRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (user) {
      loadChats();
      initializeSocket();
    }
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user]);

  const initializeSocket = () => {
    const newSocket = io(process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001', {
      auth: { userId: user?.id }
    });

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
    });

    newSocket.on('newMessage', (message: Message) => {
      if (selectedChat && message.chatId === selectedChat._id) {
        setMessages(prev => [...prev, message]);
      }
    });

    newSocket.on('messageEdited', (updatedMessage: Message) => {
      if (selectedChat && updatedMessage.chatId === selectedChat._id) {
        setMessages(prev => prev.map(msg => 
          msg._id === updatedMessage._id ? updatedMessage : msg
        ));
      }
    });

    newSocket.on('messageDeleted', (messageId: string) => {
      if (selectedChat) {
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
      }
    });

    newSocket.on('userTyping', ({ userId, chatId, isTyping: typing }) => {
      if (selectedChat && chatId === selectedChat._id && userId !== user?.id) {
        if (typing) {
          setIsTyping(`${userId} is typing`);
        } else {
          setIsTyping('');
        }
      }
    });

    setSocket(newSocket);
  };

  const loadChats = async () => {
    try {
      const data = await chatsAPI.getUserChats();
      setChats(data.chats || data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading chats:', error);
      setIsLoading(false);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const data = await messagesAPI.getChatMessages(chatId);
      setMessages(data.messages || data);
      setTimeout(() => messagesEndRef.current?.scrollToEnd(), 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    loadMessages(chat._id);
    if (isMobile) {
      setShowSidebar(false);
    }
    if (socket) {
      socket.emit('joinChat', chat._id);
    }
  };

  const handleBackToChats = () => {
    if (isMobile) {
      setShowSidebar(true);
      setSelectedChat(null);
    } else {
      onBackToChats();
    }
  };

  const handleTyping = (text: string) => {
    setNewMessage(text);
    
    if (socket && selectedChat) {
      socket.emit('typing', { chatId: selectedChat._id, isTyping: true });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { chatId: selectedChat._id, isTyping: false });
      }, 1000);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    try {
      if (editingMessage) {
        await messagesAPI.editMessage(editingMessage._id, newMessage.trim());
        setEditingMessage(null);
      } else {
        const messageData: any = {
          content: newMessage.trim(),
          senderId: user?.id,
        };
        
        if (replyingTo) {
          messageData.replyTo = replyingTo._id;
        }

        const data = await messagesAPI.sendMessage(selectedChat._id, messageData);
        setMessages(prev => [...prev, data.message || data]);
        
        if (socket) {
          socket.emit('sendMessage', {
            chatId: selectedChat._id,
            message: data.message || data
          });
        }
      }
      
      setNewMessage('');
      setReplyingTo(null);
      setTimeout(() => messagesEndRef.current?.scrollToEnd(), 100);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        const data = await usersAPI.searchUsers(query);
        setSearchResults(data.users || data);
      } catch (error) {
        console.error('Error searching users:', error);
      }
    } else {
      setSearchResults([]);
    }
  };

  const startChat = async (otherUser: User) => {
    try {
      const data = await chatsAPI.createChat({
        type: 'private',
        participants: [otherUser._id]
      });
      const newChat = data.chat || data;
      setChats(prev => [newChat, ...prev]);
      handleChatSelect(newChat);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const showMessageActions = (message: Message) => {
    const isOwn = message.sender._id === user?.id;
    const actions = ['Reply'];
    
    if (isOwn) {
      actions.push('Edit', 'Delete');
    }
    
    Alert.alert(
      'Message Actions',
      'Choose an action',
      [
        { text: 'Reply', onPress: () => setReplyingTo(message) },
        ...(isOwn ? [
          { text: 'Edit', onPress: () => {
            setEditingMessage(message);
            setNewMessage(message.content);
          }},
          { text: 'Delete', onPress: () => deleteMessage(message._id) }
        ] : []),
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await messagesAPI.deleteMessage(messageId);
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setNewMessage('');
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.sender._id === user?.id;
    
    return (
      <TouchableOpacity onLongPress={() => showMessageActions(item)}>
        <View style={[styles.messageContainer, isOwn ? styles.ownMessage : styles.otherMessage]}>
          {item.replyTo && (
            <View style={styles.replyIndicator}>
              <View style={styles.replyLine} />
              <View>
                <Text style={styles.replyAuthor}>
                  {item.replyTo.sender?.firstName || 'User'}
                </Text>
                <Text style={styles.replyMessage} numberOfLines={2}>
                  {item.replyTo.content}
                </Text>
              </View>
            </View>
          )}
          
          <View style={[
            styles.messageBubble,
            isOwn ? styles.ownBubble : styles.otherBubble
          ]}>
            <Text style={[
              styles.messageText,
              isOwn ? styles.ownMessageText : styles.otherMessageText
            ]}>
              {item.content}
            </Text>
            
            <View style={styles.messageFooter}>
              <Text style={[
                styles.messageTime,
                isOwn ? styles.ownMessageText : styles.otherMessageText
              ]}>
                {new Date(item.createdAt).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
              
              {item.edited && (
                <Text style={styles.editedLabel}>edited</Text>
              )}
              
              {isOwn && (
                <View style={styles.messageStatus}>
                  <View style={styles.statusIndicators}>
                    <Ionicons name="checkmark" size={12} color="#007AFF" />
                    <Ionicons name="checkmark" size={12} color="#007AFF" />
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSidebar = () => (
    <View style={[styles.sidebar, !showSidebar && styles.hiddenSidebar]}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>
      
      {searchResults.length > 0 && (
        <View style={styles.searchResults}>
          <Text style={styles.searchResultsTitle}>Users</Text>
          {searchResults.map((user) => (
            <TouchableOpacity
              key={user._id}
              style={styles.searchResultItem}
              onPress={() => startChat(user)}
            >
              <Avatar.Text
                size={40}
                label={`${user.firstName[0]}${user.lastName[0]}`}
              />
              <View style={styles.searchResultInfo}>
                <Text style={styles.searchResultName}>
                  {user.firstName} {user.lastName}
                </Text>
                <Text style={styles.searchResultUsername}>
                  @{user.username}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      <View style={styles.chatsHeader}>
        <Text style={styles.chatsTitle}>Chats</Text>
      </View>
      
      <FlatList
        data={chats}
        keyExtractor={(item) => item._id}
        style={styles.chatsList}
        renderItem={({ item }) => {
          const isPrivate = item.type === 'private';
          const otherParticipant = isPrivate 
            ? item.participants?.find(p => p.userId._id !== user?.id)
            : null;
          
          const chatName = item.name || 
            (otherParticipant ? `${otherParticipant.userId.firstName} ${otherParticipant.userId.lastName}` : 'Private Chat');
          
          return (
            <TouchableOpacity
              style={[
                styles.chatItem,
                selectedChat?._id === item._id && styles.selectedChatItem
              ]}
              onPress={() => handleChatSelect(item)}
            >
              <Avatar.Text
                size={40}
                label={isPrivate 
                  ? (otherParticipant?.userId.firstName?.[0] || '') + (otherParticipant?.userId.lastName?.[0] || '')
                  : item.name?.[0] || 'G'
                }
              />
              <View style={styles.chatInfo}>
                <Text style={styles.chatName}>{chatName}</Text>
                <Text style={styles.lastMessage}>
                  {item.lastMessage?.content || 'No messages yet'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

  const renderChatWindow = () => {
    if (!selectedChat) {
      return (
        <View style={styles.emptyChatWindow}>
          <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
          <Text style={styles.emptyChatText}>Select a chat to start messaging</Text>
        </View>
      );
    }

    const isPrivate = selectedChat.type === 'private';
    const otherParticipant = isPrivate 
      ? selectedChat.participants?.find(p => p.userId._id !== user?.id)
      : null;
    
    const chatName = selectedChat.name || 
      (otherParticipant ? `${otherParticipant.userId.firstName} ${otherParticipant.userId.lastName}` : 'Private Chat');

    return (
      <View style={styles.chatWindow}>
        <Appbar.Header>
          {isMobile && (
            <Appbar.BackAction onPress={handleBackToChats} />
          )}
          <Avatar.Text
            size={40}
            label={isPrivate 
              ? (otherParticipant?.userId.firstName?.[0] || '') + (otherParticipant?.userId.lastName?.[0] || '')
              : selectedChat.name?.[0] || 'G'
            }
          />
          <Appbar.Content title={chatName} />
        </Appbar.Header>

        <FlatList
          ref={messagesEndRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item._id}
          style={styles.messagesList}
          onContentSizeChange={() => messagesEndRef.current?.scrollToEnd()}
          ListFooterComponent={
            isTyping ? (
              <View style={styles.typingIndicator}>
                <Text style={styles.typingText}>{isTyping}</Text>
              </View>
            ) : null
          }
        />

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={styles.messageInputContainer}>
            {(replyingTo || editingMessage) && (
              <View style={styles.replyBar}>
                <View style={styles.replyContent}>
                  <Text style={styles.replyLabel}>
                    {editingMessage ? 'Edit message' : `Reply to ${replyingTo?.sender?.firstName || 'User'}`}
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

            <View style={styles.messageInputRow}>
              <TextInput
                style={styles.textInput}
                value={newMessage}
                onChangeText={handleTyping}
                placeholder={editingMessage ? "Edit message..." : "Type a message..."}
                multiline
                maxLength={1000}
                textAlignVertical="center"
              />
              <TouchableOpacity 
                style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]} 
                onPress={sendMessage}
                disabled={!newMessage.trim()}
              >
                <Ionicons 
                  name={editingMessage ? "checkmark" : "send"} 
                  size={20} 
                  color={!newMessage.trim() ? '#ccc' : '#fff'} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContent}>
        {(!isMobile || showSidebar) && renderSidebar()}
        {(!isMobile || !showSidebar) && renderChatWindow()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: width < 768 ? width : 320,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  hiddenSidebar: {
    display: 'none',
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  searchResults: {
    maxHeight: 200,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchResultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchResultInfo: {
    marginLeft: 12,
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '500',
  },
  searchResultUsername: {
    fontSize: 14,
    color: '#666',
  },
  chatsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  chatsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatsList: {
    flex: 1,
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
  chatName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  chatWindow: {
    flex: 1,
    backgroundColor: '#fff',
  },
  emptyChatWindow: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  emptyChatText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageContainer: {
    marginVertical: 4,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginVertical: 2,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
  },
  otherBubble: {
    backgroundColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  messageInputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    paddingBottom: 8,
  },
  messageInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    alignSelf: 'flex-end',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  replyBar: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  replyContent: {
    flex: 1,
  },
  replyLabel: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 14,
    color: '#666',
  },
  cancelButton: {
    padding: 4,
  },
  replyIndicator: {
    marginBottom: 4,
    paddingLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyLine: {
    width: 3,
    height: 30,
    backgroundColor: '#007AFF',
    marginRight: 8,
    borderRadius: 2,
  },
  replyAuthor: {
    fontSize: 12,
    fontWeight: '500',
    color: '#007AFF',
    marginBottom: 2,
  },
  replyMessage: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  editedLabel: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
    marginLeft: 8,
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  typingText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  messageStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicators: {
    marginLeft: 4,
  },
});

export default ChatScreen;
