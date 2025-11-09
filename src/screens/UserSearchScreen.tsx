import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Appbar, Searchbar, Avatar, Button } from 'react-native-paper';
import { usersAPI, chatsAPI, findOrCreateChat } from '../api';
import { User } from '../types';
import { useNavigation } from '@react-navigation/native';

const UserSearchScreen: React.FC = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 2) {
      setIsLoading(true);
      try {
        const users = await usersAPI.searchUsers(query);
        setSearchResults(users);
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSelectUser = async (user: User) => {
    try {
      // Try using the direct import first, fallback to chatsAPI method
      const findOrCreateFunction = findOrCreateChat || chatsAPI.findOrCreateChat;
      const userId = user._id || user.id; // Use _id from MongoDB response
      const result = await findOrCreateFunction(userId);
      const chat = result.chat || result;
      
      if (chat && chat._id) {
        (navigation as any).navigate('Chat', { chatId: chat._id });
      } else {
        console.error('Could not create or find chat');
      }
    } catch (error) {
      console.error('Error creating or navigating to chat:', error);
    }
  };

  const handleBlockUser = async (user: User) => {
    try {
      const userId = user._id || user.id;
      const response = await usersAPI.blockUser(userId);
      if (response.success) {
        Alert.alert('Success', `${user.firstName} has been blocked`);
        // Remove from search results
        setSearchResults(prev => prev.filter(u => (u._id || u.id) !== userId));
      } else {
        Alert.alert('Error', response.message || 'Failed to block user');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to block user');
    }
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <View style={styles.userItem}>
      <TouchableOpacity onPress={() => handleSelectUser(item)} style={styles.userInfo}>
        <Avatar.Text size={40} label={item.firstName.charAt(0) + item.lastName.charAt(0)} />
        <Text style={styles.userName}>{item.firstName} {item.lastName}</Text>
      </TouchableOpacity>
      <Button 
        mode="outlined" 
        onPress={() => handleBlockUser(item)}
        style={styles.blockButton}
        textColor="#e53935"
      >
        Block
      </Button>
    </View>
  );

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="New Chat" />
      </Appbar.Header>
      <Searchbar
        placeholder="Search for users"
        onChangeText={handleSearch}
        value={searchQuery}
        style={styles.searchbar}
      />
      {isLoading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item._id || item.id}
          renderItem={renderUserItem}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchbar: {
    margin: 10,
  },
  loader: {
    marginTop: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userName: {
    marginLeft: 15,
    fontSize: 16,
    fontWeight: '500',
  },
  blockButton: {
    borderColor: '#e53935',
    marginLeft: 10,
  },
});

export default UserSearchScreen;
