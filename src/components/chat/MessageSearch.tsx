import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { theme } from '../../theme';

interface SearchResult {
  objectID: string;
  content: string;
  sender: string;
  username: string;
  chatId: string;
  messageType: string;
  createdAt: string;
  threadId?: string;
  isThreadStarter: boolean;
  _highlightResult?: {
    content: {
      value: string;
      matchLevel: string;
      matchedWords: string[];
    };
  };
}

interface MessageSearchProps {
  isVisible: boolean;
  onClose: () => void;
  onMessageSelect?: (message: SearchResult) => void;
  currentUser: any;
  chats: any[];
}

export const MessageSearch: React.FC<MessageSearchProps> = ({
  isVisible,
  onClose,
  onMessageSelect,
  currentUser,
  chats,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(searchQuery)}`
        );
        const data = await response.json();
        if (data.success) {
          setResults(data.results.hits);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const renderItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => onMessageSelect?.(item)}
    >
      <View style={styles.resultHeader}>
        <View>
          <Text style={styles.senderName}>{item.sender}</Text>
          <Text style={styles.timestamp}>
            {format(new Date(item.createdAt), 'PP p')}
          </Text>
        </View>
        {item.messageType !== 'text' && (
          <View style={styles.messageType}>
            <Text style={styles.messageTypeText}>{item.messageType}</Text>
          </View>
        )}
      </View>
      <Text style={styles.messageContent}>{item.content}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={isVisible} animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
          <View style={styles.searchContainer}>
            <MaterialIcons
              name="search"
              size={20}
              color={theme.colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search messages..."
              value={query}
              onChangeText={text => {
                setQuery(text);
                handleSearch(text);
              }}
              returnKeyType="search"
              autoFocus
            />
          </View>
          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            style={styles.filterButton}
          >
            <MaterialIcons
              name="filter-list"
              size={24}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : results.length > 0 ? (
          <FlatList
            data={results}
            renderItem={renderItem}
            keyExtractor={item => item.objectID}
            contentContainerStyle={styles.resultsList}
          />
        ) : query ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages found</Text>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
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
  closeButton: {
    marginRight: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: theme.colors.textPrimary,
  },
  filterButton: {
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsList: {
    padding: 16,
  },
  resultItem: {
    padding: 16,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 8,
    marginBottom: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  messageType: {
    backgroundColor: theme.colors.backgroundPrimary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageTypeText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  messageContent: {
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
});
