import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { messagesAPI } from '../api';
import { Message } from '../types';

const ChatMediaGalleryScreen: React.FC = () => {
  const route = useRoute<RouteProp<{ params: { chatId: string } }, 'params'>>();
  const chatId = (route.params as any)?.chatId;
  const [mediaMessages, setMediaMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMedia = async () => {
      try {
        const res = await messagesAPI.getChatMessages(chatId, 1, 200);
        const list = (res.messages || res) as Message[];
        const filtered = list.filter(m => ['image', 'video', 'file'].includes(m.messageType));
        setMediaMessages(filtered.reverse());
      } catch (e) {
        setMediaMessages([]);
      } finally {
        setLoading(false);
      }
    };
    if (chatId) loadMedia();
  }, [chatId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2196f3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {mediaMessages.length === 0 ? (
        <View style={styles.center}><Text>No media yet</Text></View>
      ) : (
        <FlatList
          data={mediaMessages}
          numColumns={3}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.gridItem}>
              {item.messageType === 'image' ? (
                <Image source={{ uri: item.content }} style={styles.image} />
              ) : (
                <View style={styles.fileTile}>
                  <Text style={styles.fileLabel}>{item.messageType.toUpperCase()}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { padding: 4 },
  gridItem: { width: '33.33%', aspectRatio: 1, padding: 4 },
  image: { flex: 1, borderRadius: 8 },
  fileTile: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  fileLabel: { fontSize: 12, color: '#444' },
});

export default ChatMediaGalleryScreen;
