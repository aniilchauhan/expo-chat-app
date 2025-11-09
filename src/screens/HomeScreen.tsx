import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Appbar, Avatar, FAB } from 'react-native-paper';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { chatsAPI } from '../api';
import { Chat } from '../types';

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUserIds, setOnlineUserIds] = useState<Record<string, boolean>>({});
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await chatsAPI.getAllChats();
        const userChats = response.chats || response;
        console.log('🔍 HomeScreen: Loaded chats:', userChats);
        setChats(userChats);
      } catch (error) {
        console.error('Error fetching chats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChats();
  }, []);

  useEffect(() => {
    const s = io(process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001', {
      transports: ['websocket'],
      auth: { userId: user?.id || user?._id },
    });
    s.on('userOnline', ({ userId }) => setOnlineUserIds(prev => ({ ...prev, [userId]: true })));
    s.on('userOffline', ({ userId }) => setOnlineUserIds(prev => ({ ...prev, [userId]: false })));
    setSocket(s);
    return () => { s.disconnect(); };
  }, [user]);

  const renderChatItem = ({ item }: { item: Chat }) => {
    const isPrivate = item.type === 'private';
    const currentUserId = user?._id || user?.id;
    
    // Find the other participant in private chats
    const otherParticipant = isPrivate
      ? item.participants?.find((p: any) => {
          const participantId = p.userId?._id || p.userId?.id || p.userId;
          return participantId !== currentUserId;
        })
      : null;
    
    // Get chat display name
    const chatName = item.name || 
      (otherParticipant 
        ? `${otherParticipant.userId?.firstName || ''} ${otherParticipant.userId?.lastName || ''}`.trim() || 
          otherParticipant.userId?.displayName || 
          'User'
        : 'Chat');
    
    // Get avatar label
    const avatarLabel = isPrivate && otherParticipant
      ? (otherParticipant.userId?.firstName?.[0] || '') + (otherParticipant.userId?.lastName?.[0] || '')
      : item.name?.[0] || 'C';
    
    // Check if other user is online
    const otherUserId = otherParticipant?.userId;
    const otherId = typeof otherUserId === 'string' 
      ? otherUserId 
      : (otherUserId?._id || otherUserId?.id);
    const isOnline = otherId && typeof otherId === 'string' ? onlineUserIds[otherId] : false;
    
    return (
      <TouchableOpacity onPress={() => navigation.navigate('Chat', { chatId: item._id })}>
        <View style={[styles.chatItem, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View>
            <Avatar.Text size={40} label={avatarLabel} />
            {isPrivate && isOnline && <View style={[styles.onlineDot, { backgroundColor: colors.success, borderColor: colors.surface }]} />}
          </View>
          <View style={styles.chatInfo}>
            <Text style={[styles.chatName, { color: colors.text }]}>{chatName}</Text>
            <Text style={[styles.lastMessage, { color: colors.textSecondary }]}>{item.lastMessage?.content || 'No messages yet'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header>
        <Appbar.Content title="Chats" />
        <Appbar.Action icon="magnify" onPress={() => navigation.navigate('UserSearch')} />
        <Appbar.Action icon="account-group" onPress={() => navigation.navigate('GroupCreate')} />
        <Appbar.Action icon="logout" onPress={logout} />
      </Appbar.Header>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item._id}
          renderItem={renderChatItem}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textSecondary }]}>No chats yet. Start a new conversation!</Text>}
        />
      )}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('UserSearch')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
  },
  chatInfo: {
    marginLeft: 15,
  },
  chatName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  lastMessage: {
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  onlineDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
});

export default HomeScreen;