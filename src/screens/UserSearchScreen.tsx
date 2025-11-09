import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Appbar, Searchbar, Avatar, Button, SegmentedButtons, Card } from 'react-native-paper';
import { usersAPI, chatsAPI, findOrCreateChat } from '../api';
import { User } from '../types';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

type SearchMode = 'general' | 'userId';

const UserSearchScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [searchMode, setSearchMode] = useState<SearchMode>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchResult, setSearchResult] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGeneralSearch = async (query: string) => {
    setSearchQuery(query);
    setError(null);
    setSearchResult(null);
    
    if (query.trim().length > 2) {
      setIsLoading(true);
      try {
        const response = await usersAPI.searchUsers(query);
        const users = response.data || response;
        setSearchResults(users);
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
        setError('Failed to search users. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleUserIdSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a User ID');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSearchResult(null);

    try {
      const response = await usersAPI.searchUserById(searchQuery.trim());
      if (response.success && response.data) {
        setSearchResult(response.data);
      } else {
        setError('User not found or not available for search');
      }
    } catch (err: any) {
      console.error('Search error:', err);
      if (err.message.includes('404') || err.message.includes('not found')) {
        setError('User not found or not available for search');
      } else if (err.message.includes('403') || err.message.includes('Unable to search')) {
        setError('Unable to search for this user');
      } else if (err.message.includes('Network')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('An error occurred while searching. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectUser = async (user: User) => {
    try {
      // Try using the direct import first, fallback to chatsAPI method
      const findOrCreateFunction = findOrCreateChat || chatsAPI.findOrCreateChat;
      const userId = user._id || user.id; // Use _id from MongoDB response
      
      if (!userId) {
        Alert.alert('Error', 'User ID not found');
        return;
      }
      
      const result = await findOrCreateFunction(userId);
      const chat = result.chat || result;
      
      if (chat && chat._id) {
        (navigation as any).navigate('Chat', { chatId: chat._id });
      } else {
        console.error('Could not create or find chat');
        Alert.alert('Error', 'Failed to create or open chat');
      }
    } catch (error) {
      console.error('Error creating or navigating to chat:', error);
      Alert.alert('Error', 'Failed to start chat. Please try again.');
    }
  };

  const handleStartChatWithSearchResult = async () => {
    if (!searchResult) return;

    setIsLoading(true);
    setError(null);

    try {
      const findOrCreateFunction = findOrCreateChat || chatsAPI.findOrCreateChat;
      const userId = searchResult._id || searchResult.id;
      
      if (!userId) {
        setError('User ID not found');
        setIsLoading(false);
        return;
      }
      
      const result = await findOrCreateFunction(userId);
      const chat = result.chat || result;
      
      if (chat && chat._id) {
        // Reset state and navigate
        setSearchQuery('');
        setSearchResult(null);
        (navigation as any).navigate('Chat', { chatId: chat._id });
      } else {
        setError('Failed to create or open chat');
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      setError('Failed to start chat. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlockUser = async (user: User) => {
    try {
      const userId = user._id || user.id;
      
      if (!userId) {
        Alert.alert('Error', 'User ID not found');
        return;
      }
      
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

  const renderUserItem = ({ item }: { item: User }) => {
    const displayName = item.displayName || `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.username || item.email;
    const initials = item.displayName 
      ? item.displayName.charAt(0).toUpperCase()
      : (item.firstName?.charAt(0) || '') + (item.lastName?.charAt(0) || '') || item.username?.charAt(0).toUpperCase() || 'U';
    
    return (
      <View style={[styles.userItem, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => handleSelectUser(item)} style={styles.userInfo}>
          <Avatar.Text size={40} label={initials} />
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: colors.text }]}>{displayName}</Text>
            <Text style={[styles.userUsername, { color: colors.textSecondary }]}>@{item.username || item.userId}</Text>
          </View>
          {item.isOnline && <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />}
        </TouchableOpacity>
        <Button 
          mode="outlined" 
          onPress={() => handleBlockUser(item)}
          style={styles.blockButton}
          textColor={colors.error}
        >
          Block
        </Button>
      </View>
    );
  };

  const renderSearchResult = () => {
    if (!searchResult) return null;

    const displayName = searchResult.displayName || `${searchResult.firstName || ''} ${searchResult.lastName || ''}`.trim() || searchResult.username || searchResult.email;
    const initials = searchResult.displayName 
      ? searchResult.displayName.charAt(0).toUpperCase()
      : (searchResult.firstName?.charAt(0) || '') + (searchResult.lastName?.charAt(0) || '') || searchResult.username?.charAt(0).toUpperCase() || 'U';

    return (
      <Card style={[styles.resultCard, { backgroundColor: colors.surface }]}>
        <Card.Content>
          <View style={styles.resultHeader}>
            <Avatar.Text 
              size={60} 
              label={initials} 
            />
            <View style={styles.resultInfo}>
              <Text style={[styles.resultName, { color: colors.text }]}>
                {displayName}
              </Text>
              <Text style={[styles.resultUsername, { color: colors.textSecondary }]}>@{searchResult.username || searchResult.userId}</Text>
              {searchResult.statusMessage && (
                <Text style={[styles.resultStatus, { color: colors.textSecondary }]}>{searchResult.statusMessage}</Text>
              )}
              {searchResult.isOnline && (
                <View style={styles.onlineIndicator}>
                  <View style={[styles.onlineDotLarge, { backgroundColor: colors.success }]} />
                  <Text style={[styles.onlineText, { color: colors.success }]}>Online</Text>
                </View>
              )}
            </View>
          </View>
          <Button 
            mode="contained" 
            onPress={handleStartChatWithSearchResult}
            style={styles.startChatButton}
            disabled={isLoading}
          >
            {isLoading ? 'Starting Chat...' : 'Start Chat'}
          </Button>
        </Card.Content>
      </Card>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Search Users" />
      </Appbar.Header>
      
      <View style={styles.content}>
        <SegmentedButtons
          value={searchMode}
          onValueChange={(value) => {
            setSearchMode(value as SearchMode);
            setSearchQuery('');
            setSearchResults([]);
            setSearchResult(null);
            setError(null);
          }}
          buttons={[
            { value: 'general', label: 'General Search' },
            { value: 'userId', label: 'User ID' },
          ]}
          style={styles.segmentedButtons}
        />

        {searchMode === 'general' ? (
          <>
            <Searchbar
              placeholder="Search by name, email, or username"
              onChangeText={handleGeneralSearch}
              value={searchQuery}
              style={styles.searchbar}
            />
            {isLoading ? (
              <ActivityIndicator style={styles.loader} color={colors.primary} />
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item, index) => item._id || item.id || `user-${index}`}
                renderItem={renderUserItem}
                ListEmptyComponent={
                  searchQuery.trim().length > 2 ? (
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No users found</Text>
                  ) : (
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Enter at least 3 characters to search</Text>
                  )
                }
              />
            )}
          </>
        ) : (
          <>
            <View style={styles.userIdSearchContainer}>
              <Searchbar
                placeholder="Enter User ID (e.g., user123)"
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchbar}
                onSubmitEditing={handleUserIdSearch}
              />
              <Button 
                mode="contained" 
                onPress={handleUserIdSearch}
                style={styles.searchButton}
                disabled={isLoading || !searchQuery.trim()}
              >
                {isLoading ? 'Searching...' : 'Search'}
              </Button>
            </View>

            {error && (
              <Card style={[styles.errorCard, { backgroundColor: colors.surface }]}>
                <Card.Content>
                  <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                </Card.Content>
              </Card>
            )}

            {renderSearchResult()}

            {!searchResult && !error && !isLoading && (
              <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                Enter a User ID to find and connect with other users
              </Text>
            )}
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  segmentedButtons: {
    margin: 10,
  },
  searchbar: {
    margin: 10,
  },
  userIdSearchContainer: {
    margin: 10,
  },
  searchButton: {
    marginTop: 10,
    marginHorizontal: 10,
  },
  loader: {
    marginTop: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userDetails: {
    marginLeft: 15,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
  },
  userUsername: {
    fontSize: 14,
    marginTop: 2,
  },
  blockButton: {
    marginLeft: 10,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  errorCard: {
    margin: 10,
  },
  errorText: {
    fontSize: 14,
  },
  resultCard: {
    margin: 10,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  resultInfo: {
    marginLeft: 15,
    flex: 1,
  },
  resultName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultUsername: {
    fontSize: 14,
    marginTop: 2,
  },
  resultStatus: {
    fontSize: 12,
    marginTop: 4,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  onlineDotLarge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  onlineText: {
    fontSize: 12,
  },
  startChatButton: {
    marginTop: 10,
  },
  helpText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 14,
    paddingHorizontal: 20,
  },
});

export default UserSearchScreen;
