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
  ActivityIndicator,
} from 'react-native';
import { Appbar, Avatar, Menu, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { chatsAPI, messagesAPI, usersAPI, reactionsAPI, threadsAPI, announcementsAPI, voiceMessagesAPI } from '../api';
import { Chat, Message, User, Reaction, Thread, Announcement, VoiceMessage } from '../types';
import { MessageReactions } from '../components/chat/MessageReactions';
import { ReactionPicker } from '../components/chat/ReactionPicker';
import { ThreadView } from '../components/chat/ThreadView';
import { AnnouncementList } from '../components/chat/AnnouncementList';
import { EnhancedVoiceRecorder } from '../components/chat/EnhancedVoiceRecorder';
import { EnhancedVoiceMessagePlayer } from '../components/chat/EnhancedVoiceMessagePlayer';
import { MemberManagement } from '../components/chat/MemberManagement';
import { GroupSettings } from '../components/chat/GroupSettings';
import { InviteManagement } from '../components/chat/InviteManagement';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import * as ImagePicker from 'expo-image-picker';
import { Audio, Video, ResizeMode } from 'expo-av';

const { width } = Dimensions.get('window');


import { useRoute, RouteProp } from '@react-navigation/native';

type ChatScreenRouteProp = RouteProp<{ Chat: { chatId: string } }, 'Chat'>;

interface ChatScreenProps {
  navigation: any;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const route = useRoute<ChatScreenRouteProp>();
  const { chatId } = route.params;

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isTyping, setIsTyping] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingUri, setPlayingUri] = useState<string | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedMessageForReaction, setSelectedMessageForReaction] = useState<Message | null>(null);
  const [showThreadView, setShowThreadView] = useState(false);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showMemberManagement, setShowMemberManagement] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showInviteManagement, setShowInviteManagement] = useState(false);
  const messagesEndRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (user && chatId) {
      loadChatDetails();
      loadAnnouncements();
      initializeSocket();
    }
    return () => {
      if (socket) {
        socket.emit('leaveChat', chatId);
        socket.disconnect();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [user, chatId]);

  const initializeSocket = () => {
    setIsConnecting(true);
    const newSocket = io(SOCKET_URL, {
      auth: { userId: user?._id || user?.id },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
      setIsConnecting(false);
      // Join chat room for typing indicators and realtime updates
      newSocket.emit('joinChat', chatId);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from socket server');
      setIsConnecting(true);
    });

        newSocket.on('newMessage', (message: Message) => {
      if (message.chatId === chatId) {
        setMessages(prev => [...prev, message]);
        setTimeout(() => messagesEndRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });

    newSocket.on('messageEdited', (updatedMessage: Message) => {
            if (updatedMessage.chatId === chatId) {
        setMessages(prev => prev.map(msg => 
          msg._id === updatedMessage._id ? updatedMessage : msg
        ));
      }
    });

        newSocket.on('messageDeleted', (messageId: string) => {
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
    });

    // Back-end emits 'typing' and 'stopTyping' per server.js
    newSocket.on('typing', ({ chatId: incomingChatId, user }) => {
      if (incomingChatId === chatId && (user?.id || user?._id) !== (user?._id || user?.id)) {
        setIsTyping(`${user?.name || 'Someone'} is typing...`);
      }
    });
    newSocket.on('stopTyping', ({ chatId: incomingChatId, user }) => {
      if (incomingChatId === chatId && (user?.id || user?._id) !== (user?._id || user?.id)) {
        setIsTyping('');
      }
    });

        newSocket.on('messageRead', ({ messageId, userId }) => {
      setMessages(prev => prev.map(msg => 
        msg._id === messageId 
          ? { ...msg, readBy: [...(msg.readBy || []), userId] }
          : msg
      ));
    });

    // Reaction events
    newSocket.on('messageReaction', ({ messageId, reaction }) => {
      setMessages(prev => prev.map(msg => {
        if (msg._id === messageId) {
          const existingReactions = msg.reactions || [];
          const existingReactionIndex = existingReactions.findIndex(
            r => r.userId._id === reaction.userId._id
          );
          
          if (existingReactionIndex >= 0) {
            // Update existing reaction
            const updatedReactions = [...existingReactions];
            updatedReactions[existingReactionIndex] = reaction;
            return { ...msg, reactions: updatedReactions };
          } else {
            // Add new reaction
            return { ...msg, reactions: [...existingReactions, reaction] };
          }
        }
        return msg;
      }));
    });

    newSocket.on('reactionRemoved', ({ messageId, userId }) => {
      setMessages(prev => prev.map(msg => {
        if (msg._id === messageId) {
          const filteredReactions = (msg.reactions || []).filter(
            r => r.userId._id !== userId
          );
          return { ...msg, reactions: filteredReactions };
        }
        return msg;
      }));
    });

    // Thread events
    newSocket.on('threadMessage', ({ threadId, message }) => {
      // Update thread info in the original message if it's the thread we're viewing
      if (selectedThread && selectedThread._id === threadId) {
        setMessages(prev => prev.map(msg => {
          if (msg.threadId === threadId) {
            return {
              ...msg,
              threadInfo: {
                ...msg.threadInfo,
                replyCount: (msg.threadInfo?.replyCount || 0) + 1,
                lastReplyAt: new Date().toISOString(),
                lastReplyBy: message.sender._id
              }
            };
          }
          return msg;
        }));
      }
    });

    setSocket(newSocket);
  };

    const loadChatDetails = async () => {
    setIsLoading(true);
    try {
      const chatDetails = await chatsAPI.getChatById(chatId);
      setChat(chatDetails);
      const messageData = await messagesAPI.getChatMessages(chatId);
      setMessages(messageData.messages || messageData);
    } catch (error) {
      console.error('Error loading chat details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const response = await announcementsAPI.getChatAnnouncements(chatId);
      if (response.success) {
        setAnnouncements(response.announcements || []);
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  };

  const handleVoiceMessageComplete = async (voiceMessage: VoiceMessage) => {
    try {
      // Create a message with the voice message
      const messageData = {
        content: voiceMessage.url,
        messageType: 'audio',
        senderId: user?._id || user?.id || '',
        voiceMessageId: voiceMessage._id,
      };

      const response = await messagesAPI.sendMessage(chatId, messageData);
      if (response.success) {
        // Add the message to local state
        setMessages(prev => [...prev, response.message]);
        
        // Emit socket event
        if (socket) {
          socket.emit('sendMessage', {
            chatId,
            message: response.message,
          });
        }
        
        // Close voice recorder
        setShowVoiceRecorder(false);
        
        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Error sending voice message:', error);
      Alert.alert('Error', 'Failed to send voice message');
    }
  };

  
  
  
  const handleTyping = (text: string) => {
    setNewMessage(text);
    
    if (socket && chatId) {
      const currentUser = {
        id: user?._id || user?.id,
        name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User'
      };
      socket.emit('typing', { chatId, user: currentUser });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stopTyping', { chatId, user: currentUser });
      }, 1000);
    }
  };

  const sendMessage = async () => {
            if (!newMessage.trim() || !chatId) return;

    try {
      if (editingMessage) {
        const updatedMessage = await messagesAPI.editMessage(editingMessage._id, newMessage.trim());
        setMessages(prev => prev.map(msg => 
          msg._id === editingMessage._id ? updatedMessage : msg
        ));
        
        if (socket) {
          socket.emit('messageEdited', updatedMessage);
        }
        
        setEditingMessage(null);
      } else {
        console.log('🔍 Frontend: User object:', user);
        console.log('🔍 Frontend: User._id:', user?._id);
        console.log('🔍 Frontend: User.id:', user?.id);
      
        const senderId = user?._id || user?.id;
        console.log('🔍 Frontend: Final senderId:', senderId);
      
        const messageData: any = {
          content: newMessage.trim(),
          senderId: senderId,
        };
      
        console.log('🔍 Frontend: Message data being sent:', messageData); 

        if (replyingTo) {
          messageData.replyTo = replyingTo._id;
        }

                        const data = await messagesAPI.sendMessage(chatId, messageData);
        const newMsg = data.message || data;
        
        setMessages(prev => [...prev, newMsg]);
        
        if (socket) {
          socket.emit('sendMessage', {
            chatId: chatId,
            message: newMsg
          });
        }
        
        setTimeout(() => messagesEndRef.current?.scrollToEnd({ animated: true }), 100);
      }
      
      setNewMessage('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  
  const showMessageActions = (message: Message) => {
    const isOwn = message.sender._id === user?.id;
    const hasThread = message.threadId;
    
    Alert.alert(
      'Message Actions',
      'Choose an action',
      [
        { text: 'Add Reaction', onPress: () => {
          setSelectedMessageForReaction(message);
          setShowReactionPicker(true);
        }},
        { text: 'Reply', onPress: () => setReplyingTo(message) },
        { 
          text: hasThread ? 'View Thread' : 'Start Thread', 
          onPress: () => hasThread ? handleOpenThread(message) : handleCreateThread(message)
        },
        ...(isOwn ? [
          { text: 'Edit', onPress: () => {
            setEditingMessage(message);
            setNewMessage(message.content);
          }},
          { text: 'Delete', onPress: () => confirmDeleteMessage(message._id) }
        ] : []),
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const confirmDeleteMessage = (messageId: string) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMessage(messageId) }
      ]
    );
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await messagesAPI.deleteMessage(messageId);
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      
      if (socket) {
        socket.emit('messageDeleted', messageId);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      Alert.alert('Error', 'Failed to delete message. Please try again.');
    }
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setNewMessage('');
  };

  const handleReactionSelect = async (emoji: string) => {
    if (!selectedMessageForReaction || !user) return;

    try {
      const currentUserId = user._id || user.id;
      const existingReactions = selectedMessageForReaction.reactions || [];
      const existingReaction = existingReactions.find(r => r.userId._id === currentUserId);

      if (existingReaction) {
        if (existingReaction.emoji === emoji) {
          // Remove reaction if same emoji
          await reactionsAPI.removeReaction(selectedMessageForReaction._id);
          if (socket) {
            socket.emit('removeReaction', { 
              messageId: selectedMessageForReaction._id, 
              chatId: chatId 
            });
          }
        } else {
          // Update reaction with new emoji
          await reactionsAPI.addReaction(selectedMessageForReaction._id, emoji);
          if (socket) {
            socket.emit('addReaction', { 
              messageId: selectedMessageForReaction._id, 
              emoji, 
              chatId: chatId 
            });
          }
        }
      } else {
        // Add new reaction
        await reactionsAPI.addReaction(selectedMessageForReaction._id, emoji);
        if (socket) {
          socket.emit('addReaction', { 
            messageId: selectedMessageForReaction._id, 
            emoji, 
            chatId: chatId 
          });
        }
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
      Alert.alert('Error', 'Failed to add reaction. Please try again.');
    }
  };

  const handleReactionPress = (emoji: string) => {
    if (selectedMessageForReaction) {
      handleReactionSelect(emoji);
    }
  };

  const handleCreateThread = async (message: Message) => {
    try {
      const response = await threadsAPI.createThread(message._id);
      if (response.success) {
        const thread = response.thread;
        setSelectedThread(thread);
        setShowThreadView(true);
        
        // Update the message to show it has a thread
        setMessages(prev => prev.map(msg => 
          msg._id === message._id 
            ? { ...msg, threadId: thread._id, isThreadStarter: true }
            : msg
        ));
      }
    } catch (error) {
      console.error('Error creating thread:', error);
      Alert.alert('Error', 'Failed to create thread. Please try again.');
    }
  };

  const handleOpenThread = async (message: Message) => {
    if (message.threadId) {
      try {
        const response = await threadsAPI.getThread(message.threadId);
        if (response.success) {
          setSelectedThread(response.thread);
          setShowThreadView(true);
        }
      } catch (error) {
        console.error('Error loading thread:', error);
        Alert.alert('Error', 'Failed to load thread. Please try again.');
      }
    }
  };

  const handleCloseThread = () => {
    setShowThreadView(false);
    setSelectedThread(null);
  };

    const handleShareLocation = async () => {
    if (!chatId || !user) return;

    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Permission to access location was denied');
      return;
    }

    try {
      let location = await Location.getCurrentPositionAsync({});
      const locationMessage = {
        messageType: 'location',
        content: JSON.stringify({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }),
        senderId: user?._id || user?.id,
      };

                  const data = await messagesAPI.sendMessage(chatId, locationMessage);
      const newMsg = data.message || data;

      setMessages(prev => [...prev, newMsg]);

      if (socket) {
        socket.emit('sendMessage', {
          chatId: chatId,
          message: newMsg,
        });
      }

      setTimeout(() => messagesEndRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error('Error sharing location:', error);
      Alert.alert('Error', 'Could not share location. Please try again.');
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Microphone permission is required to record audio.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
         Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    
    if (uri && chatId && user) {
      try {
        // Upload audio and send the URL
        const file: any = { uri, name: 'voice-message.m4a', type: 'audio/m4a' };
        const upload = await (await import('../api')).uploadAPI.uploadChatMedia(file, chatId);
        const audioUrl = upload.url || upload.fileUrl || upload.path || uri;

        const audioMessage = {
          messageType: 'audio',
          content: audioUrl,
          senderId: user._id || user.id,
        } as any;

        const data = await messagesAPI.sendMessage(chatId, audioMessage);
        const newMsg = data.message || data;
        setMessages(prev => [...prev, newMsg]);
        if (socket) {
          socket.emit('sendMessage', { chatId, message: newMsg });
        }
      } catch (error) {
        console.error('Failed to upload/send voice message', error);
        Alert.alert('Error', 'Failed to send voice message.');
      }
    }
    setRecording(null);
  };

  const playSound = async (uri: string) => {
    if (playingUri === uri) {
      if (sound) {
        await sound.stopAsync();
        setPlayingUri(null);
      }
      return;
    }

    if (sound) {
      await sound.unloadAsync();
    }

    try {
      const { sound: newSound } = await Audio.Sound.createAsync({ uri });
      setSound(newSound);
      setPlayingUri(uri);
      await newSound.playAsync();
      newSound.setOnPlaybackStatusUpdate(async (status) => {
        if ('didJustFinish' in status && status.didJustFinish) {
          await newSound.unloadAsync();
          setSound(null);
          setPlayingUri(null);
        }
      });
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

    const handleTakePhoto = async () => {
    if (!chatId || !user) return;

    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert('Permission Denied', 'Camera and media library permissions are required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const messageType = asset.type === 'video' ? 'video' : 'image';
      try {
        const file: any = { uri: asset.uri, name: `upload.${messageType === 'video' ? 'mp4' : 'jpg'}`, type: messageType === 'video' ? 'video/mp4' : 'image/jpeg' };
        const upload = await (await import('../api')).uploadAPI.uploadChatMedia(file, chatId);
        const url = upload.url || upload.fileUrl || upload.path || asset.uri;

        const mediaMessage = {
          messageType,
          content: url,
          senderId: user._id || user.id,
        } as any;

        const data = await messagesAPI.sendMessage(chatId, mediaMessage);
        const newMsg = data.message || data;

        setMessages(prev => [...prev, newMsg]);

        if (socket) {
          socket.emit('sendMessage', { chatId, message: newMsg });
        }
      } catch (error) {
        console.error('Failed to upload media', error);
        Alert.alert('Error', 'Failed to send media.');
      }
    }
  };

    const handleShareContact = async () => {
    if (!chatId || !user) return;

    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Permission to access contacts was denied');
      return;
    }

    try {
      const contact = await Contacts.presentContactPickerAsync();
      if (contact) {
        const contactMessage = {
          messageType: 'contact',
          content: JSON.stringify({
            name: contact.name,
            phoneNumber: contact.phoneNumbers ? contact.phoneNumbers[0].number : '',
          }),
          senderId: user._id || user.id,
        };

                        const data = await messagesAPI.sendMessage(chatId, contactMessage);
        const newMsg = data.message || data;

        setMessages(prev => [...prev, newMsg]);

        if (socket) {
          socket.emit('sendMessage', {
            chatId: chatId,
            message: newMsg,
          });
        }

        setTimeout(() => messagesEndRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (error) {
      console.error('Error sharing contact:', error);
      Alert.alert('Error', 'Could not share contact. Please try again.');
    }
  };

  const showAttachmentMenu = () => {
    Alert.alert(
      'Share Content',
      'Choose what you want to share',
      [
        {
          text: 'Share Location',
          onPress: handleShareLocation,
        },
        {
          text: 'Share Contact',
          onPress: handleShareContact,
        },
        {
          text: 'Take Photo or Video',
          onPress: handleTakePhoto,
        },
        {
          text: 'Record Voice Message',
          onPress: startRecording,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderMessageContent = (item: Message) => {
    switch (item.messageType) {
      case 'location':
        try {
          const { latitude, longitude } = JSON.parse(item.content);
          return (
            <TouchableOpacity onPress={() => {}} style={styles.locationContainer}>
              <Ionicons name="location-sharp" size={24} color="#007AFF" />
              <Text style={styles.locationText}>Location Shared</Text>
              <Text style={styles.locationCoords}>Lat: {latitude.toFixed(4)}, Lon: {longitude.toFixed(4)}</Text>
            </TouchableOpacity>
          );
        } catch (e) {
          return <Text style={styles.messageText}>Invalid location data</Text>;
        }
      case 'contact':
        try {
          const contact = JSON.parse(item.content);
          return (
            <View style={styles.contactContainer}>
              <Ionicons name="person-circle" size={24} color="#4F8EF7" />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactPhone}>{contact.phone}</Text>
              </View>
            </View>
          );
        } catch (e) {
          return <Text style={styles.messageText}>Invalid contact data</Text>;
        }
      case 'audio':
        // Check if this message has a voice message ID for enhanced playback
        if (item.voiceMessageId) {
          // For enhanced voice messages, we need to fetch the voice message data
          // For now, create a mock voice message with the available data
          const mockVoiceMessage: VoiceMessage = {
            _id: item.voiceMessageId,
            url: item.content,
            duration: 0, // Will be updated when voice message is loaded
            sender: item.sender,
            chat: item.chatId,
            waveform: [], // Will be updated when voice message is loaded
            status: 'sent',
            messageRef: item._id,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          };
          
          return (
            <EnhancedVoiceMessagePlayer
              voiceMessage={mockVoiceMessage}
              onPlay={() => setPlayingUri(item.content)}
              onPause={() => setPlayingUri(null)}
              showTranscription={true}
            />
          );
        } else {
          // Fallback to simple audio player for legacy messages
          return (
            <TouchableOpacity onPress={() => playSound(item.content)} style={styles.audioMessageContainer}>
              <Ionicons name={playingUri === item.content ? 'stop-circle' : 'play-circle'} size={32} color="#007AFF" />
              <Text style={styles.audioText}>Voice Message</Text>
            </TouchableOpacity>
          );
        }
      case 'video':
        return (
          <View style={styles.videoContainer}>
            <Video
              source={{ uri: item.content }}
              rate={1.0}
              volume={1.0}
              isMuted={false}
              resizeMode={ResizeMode.COVER}
              shouldPlay={false}
              useNativeControls
              style={styles.videoPlayer}
            />
          </View>
        );
      default:
        return <Text style={styles.messageText}>{item.content}</Text>;
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.sender._id === (user?._id || user?.id);
    const isRead = item.readBy && item.readBy.length > 0;
    
    return (
      <TouchableOpacity 
        onLongPress={() => showMessageActions(item)}
        onLayout={() => {
          // Mark as read when message is laid out on screen for non-own messages
          if (!isOwn && socket) {
            const viewerId = (user?._id || user?.id) as string;
            if (viewerId) {
              messagesAPI.markAsRead(item._id, viewerId).catch(() => {});
            }
          }
        }}
        style={[styles.messageContainer, isOwn ? styles.ownMessage : styles.otherMessage]}
      >
        {item.replyTo && (
          <View style={styles.replyIndicator}>
            <View style={styles.replyLine} />
            <View style={styles.replyContent}>
              <Text style={styles.replyAuthor}>
                {item.replyTo.sender?.firstName || 'User'}
              </Text>
              <Text style={styles.replyMessage} numberOfLines={2}>
                {item.replyTo.content}
              </Text>
            </View>
          </View>
        )}
          {renderMessageContent(item)}
          
          {item.reactions && item.reactions.length > 0 && (
            <MessageReactions
              reactions={item.reactions}
              onReactionPress={handleReactionPress}
              style={styles.messageReactions}
            />
          )}
          
          {item.threadInfo && item.threadInfo.replyCount > 0 && (
            <TouchableOpacity 
              style={styles.threadIndicator}
              onPress={() => handleOpenThread(item)}
            >
              <Ionicons name="chatbubbles-outline" size={14} color="#007AFF" />
              <Text style={styles.threadText}>
                {item.threadInfo.replyCount} {item.threadInfo.replyCount === 1 ? 'reply' : 'replies'}
              </Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isOwn ? styles.ownMessageText : styles.otherMessageText
            ]}>
              {formatTime(item.createdAt)}
            </Text>
            
            {item.edited && (
              <Text style={styles.editedLabel}>edited</Text>
            )}
            
            {isOwn && (
              <View style={styles.messageStatus}>
                <Ionicons 
                  name="checkmark" 
                  size={12} 
                  color={isRead ? '#007AFF' : '#ccc'} 
                />
                <Ionicons 
                  name="checkmark" 
                  size={12} 
                  color={isRead ? '#007AFF' : '#ccc'} 
                  style={{ marginLeft: -4 }}
                />
              </View>
            )}
          </View>
      </TouchableOpacity>
    );
  };

  
  
  if (isLoading || !chat) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </SafeAreaView>
    );
  }

  const isPrivate = chat.type === 'private';
  const otherParticipant = isPrivate
    ? chat.participants?.find(p => p.userId._id !== user?.id)
    : null;

  const chatName = chat.name ||
    (otherParticipant ? `${otherParticipant.userId.firstName} ${otherParticipant.userId.lastName}` : 'Private Chat');

  const presenceLabel = isPrivate
    ? (otherParticipant?.userId?.isOnline ? 'Online' : `Last seen ${new Date(otherParticipant?.userId?.lastSeen || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
    : undefined;

  const handleBlockUser = async (userId: string) => {
    if (!user || !chatId) return;

    try {
      await usersAPI.blockUser(userId);
      Alert.alert('User Blocked', 'You have blocked this user.');
      navigation.goBack(); // Go back to the previous chat or chats list
    } catch (error) {
      console.error('Error blocking user:', error);
      Alert.alert('Error', 'Failed to block user. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
       <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Avatar.Text
            size={40}
            label={isPrivate 
              ? (otherParticipant?.userId.firstName?.[0] || '') + (otherParticipant?.userId.lastName?.[0] || '')
              : chat.name?.[0] || 'G'
            }
          />
          <Appbar.Content title={chatName} subtitle={presenceLabel} />
          {chat.type === 'group' && (
            <Appbar.Action 
              icon="account-group" 
              onPress={() => setShowMemberManagement(true)}
            />
          )}
          {chat.type === 'group' && (
            <Appbar.Action 
              icon="link" 
              onPress={() => setShowInviteManagement(true)}
            />
          )}
          {chat.type === 'group' && (
            <Appbar.Action 
              icon="bell" 
              onPress={() => setShowAnnouncements(true)}
              iconColor={announcements.length > 0 ? '#FF3B30' : undefined}
            />
          )}
          {chat.type === 'group' && (
            <Appbar.Action 
              icon="cog" 
              onPress={() => setShowGroupSettings(true)}
            />
          )}
          {isPrivate && otherParticipant && (
            <Appbar.Action icon="account-remove" onPress={() => handleBlockUser(otherParticipant.userId._id)} />
          )}
          <Appbar.Action icon="call" onPress={() => navigation.navigate('Call')} />
          <Appbar.Action icon="image" onPress={() => navigation.navigate('ChatMediaGallery', { chatId })} />
          {isConnecting && (
            <ActivityIndicator size="small" color="#007AFF" style={{ marginRight: 16 }} />
          )}
        </Appbar.Header>

        <KeyboardAvoidingView 
          style={styles.chatWindow}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            ref={messagesEndRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item._id}
            style={styles.messagesList}
            onContentSizeChange={() => messagesEndRef.current?.scrollToEnd({ animated: true })}
            ListFooterComponent={
              isTyping ? (
                <View style={styles.typingIndicator}>
                  <Text style={styles.typingText}>{isTyping}</Text>
                </View>
              ) : null
            }
          />

          <View style={styles.messageInputContainer}>
            {(replyingTo || editingMessage) && (
              <View style={styles.replyBar}>
                <View style={styles.replyBarContent}>
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
              <TouchableOpacity style={styles.attachButton} onPress={showAttachmentMenu}>
                <Ionicons name="add" size={24} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.voiceButton} 
                onPress={() => setShowVoiceRecorder(true)}
              >
                <Ionicons name="mic" size={24} color="#007AFF" />
              </TouchableOpacity>
              <TextInput
                style={styles.textInput}
                value={newMessage}
                onChangeText={handleTyping}
                placeholder={editingMessage ? "Edit message..." : "Type a message..."}
                multiline
                maxLength={1000}
                textAlignVertical="top"
              />
              {isRecording && (
                <TouchableOpacity style={styles.recordButton} onPress={stopRecording}>
                  <Ionicons name="stop-circle" size={24} color="red" />
                </TouchableOpacity>
              )}
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
        
        <ReactionPicker
          isVisible={showReactionPicker}
          onClose={() => {
            setShowReactionPicker(false);
            setSelectedMessageForReaction(null);
          }}
          onSelect={handleReactionSelect}
        />
        
        {showThreadView && selectedThread && (
          <ThreadView
            thread={selectedThread}
            currentUser={user}
            onBack={handleCloseThread}
          />
        )}
        
        {showAnnouncements && (
          <AnnouncementList
            chatId={chatId}
            currentUserId={user?._id || user?.id || ''}
            userRole="admin" // TODO: Get actual user role from chat participants
            onClose={() => setShowAnnouncements(false)}
          />
        )}
        
        {showVoiceRecorder && (
          <EnhancedVoiceRecorder
            chatId={chatId}
            onRecordingComplete={handleVoiceMessageComplete}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        )}
        
        {showMemberManagement && (
          <MemberManagement
            chat={chat}
            currentUserId={user?._id || user?.id || ''}
            isVisible={showMemberManagement}
            onClose={() => setShowMemberManagement(false)}
            onMemberUpdate={() => {
              // Reload chat details when members are updated
              loadChatDetails();
            }}
          />
        )}
        
        {showGroupSettings && (
          <GroupSettings
            chat={chat}
            currentUserId={user?._id || user?.id || ''}
            isVisible={showGroupSettings}
            onClose={() => setShowGroupSettings(false)}
            onSettingsUpdate={() => {
              // Reload chat details when settings are updated
              loadChatDetails();
            }}
          />
        )}
        
        {showInviteManagement && (
          <InviteManagement
            chat={chat}
            currentUserId={user?._id || user?.id || ''}
            isVisible={showInviteManagement}
            onClose={() => setShowInviteManagement(false)}
            onInviteUpdate={() => {
              // Reload chat details when invites are updated
              loadChatDetails();
            }}
          />
        )}
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  lastMessageTime: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
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
  senderName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#007AFF',
    marginBottom: 4,
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
  messageStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  messageInputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
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
  replyBarContent: {
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
    padding: 8,
  },
  messageInputRow: {
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
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 40,
    textAlignVertical: 'top',
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  attachButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  audioText: {
    marginLeft: 10,
    color: '#000',
  },
  videoContainer: {
    width: 250,
    height: 150,
    borderRadius: 10,
    overflow: 'hidden',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  replyIndicator: {
    marginBottom: 4,
    paddingLeft: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  replyLine: {
    width: 3,
    height: 30,
    backgroundColor: '#007AFF',
    marginRight: 8,
    borderRadius: 2,
  },
  replyContent: {
    flex: 1,
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
  locationContainer: {
    alignItems: 'center',
    padding: 10,
  },
  locationText: {
    color: '#007AFF',
    fontWeight: 'bold',
    marginVertical: 4,
  },
  locationCoords: {
    fontSize: 12,
    color: '#666',
  },
  contactContainer: {
    alignItems: 'center',
    padding: 10,
  },
  contactName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginVertical: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
  },
  messageReactions: {
    marginTop: 4,
    marginBottom: 2,
  },
  threadIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  threadText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default ChatScreen;
