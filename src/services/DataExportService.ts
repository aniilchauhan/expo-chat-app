import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import OfflineStorage from './OfflineStorage';

interface ExportData {
  version: string;
  timestamp: string;
  user: {
    settings: any;
    blockedUsers: any[];
  };
  chats: any[];
  messages: { [chatId: string]: any[] };
  users: any[];
  metadata: {
    totalChats: number;
    totalMessages: number;
    totalUsers: number;
    exportSize: number;
  };
}

class DataExportService {
  private static instance: DataExportService;
  private readonly EXPORT_VERSION = '1.0.0';
  private readonly EXPORT_DIR = `${FileSystem.documentDirectory}exports/`;

  private constructor() {
    this.ensureExportDirectory();
  }

  static getInstance(): DataExportService {
    if (!DataExportService.instance) {
      DataExportService.instance = new DataExportService();
    }
    return DataExportService.instance;
  }

  private async ensureExportDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.EXPORT_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.EXPORT_DIR, { intermediates: true });
      }
    } catch (error) {
      console.error('Error creating export directory:', error);
    }
  }

  async exportData(): Promise<string> {
    try {
      console.log('Starting data export...');
      
      // Collect all data
      const exportData: ExportData = {
        version: this.EXPORT_VERSION,
        timestamp: new Date().toISOString(),
        user: await this.collectUserData(),
        chats: await this.collectChatsData(),
        messages: await this.collectMessagesData(),
        users: await this.collectUsersData(),
        metadata: {
          totalChats: 0,
          totalMessages: 0,
          totalUsers: 0,
          exportSize: 0
        }
      };

      // Calculate metadata
      exportData.metadata.totalChats = exportData.chats.length;
      exportData.metadata.totalMessages = Object.values(exportData.messages).reduce((acc, msgs) => acc + msgs.length, 0);
      exportData.metadata.totalUsers = exportData.users.length;

      // Convert to JSON and save
      const jsonData = JSON.stringify(exportData, null, 2);
      const fileName = `chatapp_backup_${new Date().toISOString().split('T')[0]}.json`;
      const filePath = `${this.EXPORT_DIR}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, jsonData);
      
      // Update metadata with file size
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      exportData.metadata.exportSize = fileInfo.size || 0;

      console.log('Data export completed successfully');
      return filePath;
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new Error('Failed to export data');
    }
  }

  private async collectUserData(): Promise<any> {
    try {
      const settings = await AsyncStorage.getItem('user_theme');
      const blockedUsers = await OfflineStorage.getInstance().getBlockedUsers();
      
      return {
        settings: settings ? JSON.parse(settings) : null,
        blockedUsers
      };
    } catch (error) {
      console.error('Error collecting user data:', error);
      return { settings: null, blockedUsers: [] };
    }
  }

  private async collectChatsData(): Promise<any[]> {
    try {
      return await OfflineStorage.getInstance().getCachedChats();
    } catch (error) {
      console.error('Error collecting chats data:', error);
      return [];
    }
  }

  private async collectMessagesData(): Promise<{ [chatId: string]: any[] }> {
    try {
      const chats = await OfflineStorage.getInstance().getCachedChats();
      const messages: { [chatId: string]: any[] } = {};

      for (const chat of chats) {
        const chatMessages = await OfflineStorage.getInstance().getCachedMessages(chat._id);
        if (chatMessages.length > 0) {
          messages[chat._id] = chatMessages;
        }
      }

      return messages;
    } catch (error) {
      console.error('Error collecting messages data:', error);
      return {};
    }
  }

  private async collectUsersData(): Promise<any[]> {
    try {
      return await OfflineStorage.getInstance().getCachedUsers();
    } catch (error) {
      console.error('Error collecting users data:', error);
      return [];
    }
  }

  async shareExport(): Promise<void> {
    try {
      const exportPath = await this.exportData();
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(exportPath, {
          mimeType: 'application/json',
          dialogTitle: 'Share ChatApp Backup',
          UTI: 'public.json'
        });
      } else {
        console.log('Sharing not available on this device');
      }
    } catch (error) {
      console.error('Error sharing export:', error);
      throw new Error('Failed to share export');
    }
  }

  async importData(): Promise<{ success: boolean; message: string; importedData?: ExportData }> {
    try {
      console.log('Starting data import...');
      
      // Pick file
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { success: false, message: 'Import cancelled' };
      }

      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const importData: ExportData = JSON.parse(fileContent);

      // Validate import data
      if (!this.validateImportData(importData)) {
        return { success: false, message: 'Invalid backup file format' };
      }

      // Import data
      await this.importUserData(importData.user);
      await this.importChatsData(importData.chats);
      await this.importMessagesData(importData.messages);
      await this.importUsersData(importData.users);

      console.log('Data import completed successfully');
      return { 
        success: true, 
        message: `Successfully imported ${importData.metadata.totalChats} chats, ${importData.metadata.totalMessages} messages, and ${importData.metadata.totalUsers} users`,
        importedData: importData
      };
    } catch (error) {
      console.error('Error importing data:', error);
      return { success: false, message: 'Failed to import data' };
    }
  }

  private validateImportData(data: any): boolean {
    return (
      data &&
      data.version &&
      data.timestamp &&
      data.user &&
      data.chats &&
      data.messages &&
      data.users &&
      data.metadata
    );
  }

  private async importUserData(userData: any): Promise<void> {
    try {
      if (userData.settings) {
        await AsyncStorage.setItem('user_theme', JSON.stringify(userData.settings));
      }
      
      // Note: Blocked users would need to be imported to backend
      // For now, we'll just log them
      if (userData.blockedUsers && userData.blockedUsers.length > 0) {
        console.log(`Found ${userData.blockedUsers.length} blocked users to import`);
      }
    } catch (error) {
      console.error('Error importing user data:', error);
    }
  }

  private async importChatsData(chats: any[]): Promise<void> {
    try {
      await OfflineStorage.getInstance().cacheChats(chats);
    } catch (error) {
      console.error('Error importing chats data:', error);
    }
  }

  private async importMessagesData(messages: { [chatId: string]: any[] }): Promise<void> {
    try {
      for (const [chatId, chatMessages] of Object.entries(messages)) {
        await OfflineStorage.getInstance().cacheMessages(chatId, chatMessages);
      }
    } catch (error) {
      console.error('Error importing messages data:', error);
    }
  }

  private async importUsersData(users: any[]): Promise<void> {
    try {
      await OfflineStorage.getInstance().cacheUsers(users);
    } catch (error) {
      console.error('Error importing users data:', error);
    }
  }

  async getExportHistory(): Promise<string[]> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.EXPORT_DIR);
      return files.filter(file => file.endsWith('.json'));
    } catch (error) {
      console.error('Error reading export history:', error);
      return [];
    }
  }

  async deleteExport(fileName: string): Promise<void> {
    try {
      const filePath = `${this.EXPORT_DIR}${fileName}`;
      await FileSystem.deleteAsync(filePath);
      console.log(`Deleted export file: ${fileName}`);
    } catch (error) {
      console.error('Error deleting export file:', error);
      throw new Error('Failed to delete export file');
    }
  }

  async getExportInfo(filePath: string): Promise<ExportData | null> {
    try {
      const fileContent = await FileSystem.readAsStringAsync(filePath);
      const exportData: ExportData = JSON.parse(fileContent);
      return exportData;
    } catch (error) {
      console.error('Error reading export file:', error);
      return null;
    }
  }
}

export default DataExportService;
export type { ExportData };
