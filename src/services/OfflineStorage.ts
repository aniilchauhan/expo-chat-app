import AsyncStorage from '@react-native-async-storage/async-storage';

interface CachedChat {
  _id: string;
  name?: string;
  type: 'private' | 'group';
  participants: any[];
  lastMessage?: any;
  updatedAt: string;
}

interface CachedMessage {
  _id: string;
  chatId: string;
  content: string;
  messageType: string;
  sender: any;
  timestamp: string;
  readBy?: any[];
}

interface CachedUser {
  _id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
}

class OfflineStorage {
  private static instance: OfflineStorage;
  
  // Storage keys
  private readonly CHATS_KEY = 'cached_chats';
  private readonly MESSAGES_KEY = 'cached_messages';
  private readonly USERS_KEY = 'cached_users';
  private readonly LAST_SYNC_KEY = 'last_sync_timestamp';

  private constructor() {}

  static getInstance(): OfflineStorage {
    if (!OfflineStorage.instance) {
      OfflineStorage.instance = new OfflineStorage();
    }
    return OfflineStorage.instance;
  }

  // Chat caching
  async cacheChats(chats: CachedChat[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.CHATS_KEY, JSON.stringify(chats));
      console.log('Chats cached successfully');
    } catch (error) {
      console.error('Error caching chats:', error);
    }
  }

  async getCachedChats(): Promise<CachedChat[]> {
    try {
      const chats = await AsyncStorage.getItem(this.CHATS_KEY);
      return chats ? JSON.parse(chats) : [];
    } catch (error) {
      console.error('Error getting cached chats:', error);
      return [];
    }
  }

  async updateCachedChat(chatId: string, updates: Partial<CachedChat>): Promise<void> {
    try {
      const chats = await this.getCachedChats();
      const chatIndex = chats.findIndex(chat => chat._id === chatId);
      
      if (chatIndex !== -1) {
        chats[chatIndex] = { ...chats[chatIndex], ...updates };
        await this.cacheChats(chats);
      }
    } catch (error) {
      console.error('Error updating cached chat:', error);
    }
  }

  // Message caching
  async cacheMessages(chatId: string, messages: CachedMessage[]): Promise<void> {
    try {
      const key = `${this.MESSAGES_KEY}_${chatId}`;
      await AsyncStorage.setItem(key, JSON.stringify(messages));
      console.log(`Messages cached for chat ${chatId}`);
    } catch (error) {
      console.error('Error caching messages:', error);
    }
  }

  async getCachedMessages(chatId: string): Promise<CachedMessage[]> {
    try {
      const key = `${this.MESSAGES_KEY}_${chatId}`;
      const messages = await AsyncStorage.getItem(key);
      return messages ? JSON.parse(messages) : [];
    } catch (error) {
      console.error('Error getting cached messages:', error);
      return [];
    }
  }

  async addCachedMessage(chatId: string, message: CachedMessage): Promise<void> {
    try {
      const messages = await this.getCachedMessages(chatId);
      messages.push(message);
      
      // Keep only last 100 messages to prevent storage bloat
      if (messages.length > 100) {
        messages.splice(0, messages.length - 100);
      }
      
      await this.cacheMessages(chatId, messages);
    } catch (error) {
      console.error('Error adding cached message:', error);
    }
  }

  async updateCachedMessage(chatId: string, messageId: string, updates: Partial<CachedMessage>): Promise<void> {
    try {
      const messages = await this.getCachedMessages(chatId);
      const messageIndex = messages.findIndex(msg => msg._id === messageId);
      
      if (messageIndex !== -1) {
        messages[messageIndex] = { ...messages[messageIndex], ...updates };
        await this.cacheMessages(chatId, messages);
      }
    } catch (error) {
      console.error('Error updating cached message:', error);
    }
  }

  async deleteCachedMessage(chatId: string, messageId: string): Promise<void> {
    try {
      const messages = await this.getCachedMessages(chatId);
      const filteredMessages = messages.filter(msg => msg._id !== messageId);
      await this.cacheMessages(chatId, filteredMessages);
    } catch (error) {
      console.error('Error deleting cached message:', error);
    }
  }

  // User caching
  async cacheUsers(users: CachedUser[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.USERS_KEY, JSON.stringify(users));
      console.log('Users cached successfully');
    } catch (error) {
      console.error('Error caching users:', error);
    }
  }

  async getCachedUsers(): Promise<CachedUser[]> {
    try {
      const users = await AsyncStorage.getItem(this.USERS_KEY);
      return users ? JSON.parse(users) : [];
    } catch (error) {
      console.error('Error getting cached users:', error);
      return [];
    }
  }

  async getCachedUser(userId: string): Promise<CachedUser | null> {
    try {
      const users = await this.getCachedUsers();
      return users.find(user => user._id === userId) || null;
    } catch (error) {
      console.error('Error getting cached user:', error);
      return null;
    }
  }

  async updateCachedUser(userId: string, updates: Partial<CachedUser>): Promise<void> {
    try {
      const users = await this.getCachedUsers();
      const userIndex = users.findIndex(user => user._id === userId);
      
      if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...updates };
        await this.cacheUsers(users);
      }
    } catch (error) {
      console.error('Error updating cached user:', error);
    }
  }

  // Sync management
  async setLastSyncTimestamp(): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      await AsyncStorage.setItem(this.LAST_SYNC_KEY, timestamp);
    } catch (error) {
      console.error('Error setting last sync timestamp:', error);
    }
  }

  async getLastSyncTimestamp(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.LAST_SYNC_KEY);
    } catch (error) {
      console.error('Error getting last sync timestamp:', error);
      return null;
    }
  }

  // Clear all cached data
  async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith(this.CHATS_KEY) || 
        key.startsWith(this.MESSAGES_KEY) || 
        key.startsWith(this.USERS_KEY) ||
        key === this.LAST_SYNC_KEY
      );
      
      await AsyncStorage.multiRemove(cacheKeys);
      console.log('All cache cleared successfully');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Get storage size info
  async getStorageInfo(): Promise<{ totalSize: number; itemCount: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      let itemCount = 0;

      for (const key of keys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            totalSize += value.length;
            itemCount++;
          }
        } catch (error) {
          // Skip this key
        }
      }

      return { totalSize, itemCount };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { totalSize: 0, itemCount: 0 };
    }
  }
}

export default OfflineStorage;
export type { CachedChat, CachedMessage, CachedUser };
