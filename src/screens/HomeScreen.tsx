import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Appbar, Avatar, FAB } from 'react-native-paper';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { chatsAPI } from '../api';
import { Chat } from '../types';

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUserIds, setOnlineUserIds] = useState<Record<string, boolean>>({});
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const userChats = await chatsAPI.getAllChats();
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

  const renderChatItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity onPress={() => navigation.navigate('Chat', { chatId: item._id })}>
      <View style={styles.chatItem}>
        <View>
          <Avatar.Text size={40} label={item.name ? item.name.charAt(0) : 'C'} />
          {item.type === 'private' && (() => {
            const other = item.participants?.find((p: any) => (p.userId?._id || p.userId) !== (user?.id || user?._id));
            const otherId = other?.userId?._id || other?.userId;
            const isOnline = otherId ? onlineUserIds[otherId] : false;
            return isOnline ? <View style={styles.onlineDot} /> : null;
          })()}
        </View>
        <View style={styles.chatInfo}>
          <Text style={styles.chatName}>{item.name || 'Chat'}</Text>
          <Text style={styles.lastMessage}>{item.lastMessage?.content}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Chats" />
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
          ListEmptyComponent={<Text style={styles.emptyText}>No chats yet. Start a new conversation!</Text>}
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
    borderBottomColor: '#eee',
  },
  chatInfo: {
    marginLeft: 15,
  },
  chatName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  lastMessage: {
    color: 'gray',
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
    color: 'gray',
  },
  onlineDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 10,
    height: 10,
    backgroundColor: '#2ecc71',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
});

export default HomeScreen;