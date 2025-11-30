import AsyncStorage from '@react-native-async-storage/async-storage';
import { RegisterData } from '../types';
import { API_BASE_URL as CONFIG_API_BASE_URL } from '../config';

// API Configuration
const API_BASE_URL = CONFIG_API_BASE_URL;

// Helper function to get auth headers
const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Network error" }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// Authentication API
export const authAPI = {
  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  async register(userData: RegisterData) {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },

  async getCurrentUser() {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Biometric authentication
  async enableBiometric(deviceId: string, biometricType: string) {
    const response = await fetch(`${API_BASE_URL}/api/biometric/enable`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ deviceId, biometricType }),
    });
    return handleResponse(response);
  },

  async disableBiometric() {
    const response = await fetch(`${API_BASE_URL}/api/biometric/disable`, {
      method: "POST",
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getBiometricStatus() {
    const response = await fetch(`${API_BASE_URL}/api/biometric/status`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async verifyBiometric(deviceId: string) {
    const response = await fetch(`${API_BASE_URL}/api/biometric/verify`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ deviceId }),
    });
    return handleResponse(response);
  },

  async logout() {
    const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },
  async forgotPassword(email: string) {
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return handleResponse(response);
  },
  async resetPassword(token: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    return handleResponse(response);
  },
};

// Users API
export const usersAPI = {
  async getProfile() {
    const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },
  async savePushToken(token: string, userId: string) {
    const response = await fetch(`${API_BASE_URL}/api/notifications/register-token`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ token, userId, platform: 'mobile' })
    });
    return handleResponse(response);
  },

  async removePushToken(userId: string) {
    const response = await fetch(`${API_BASE_URL}/api/notifications/unregister-token`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ userId })
    });
    return handleResponse(response);
  },

  async updateProfile(profileData: {
    firstName?: string;
    lastName?: string;
    username?: string;
    status?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
      method: "PUT",
      headers: await getAuthHeaders(),
      body: JSON.stringify(profileData),
    });
    return handleResponse(response);
  },

  async searchUsers(query: string) {
    console.log('🔍 Frontend: Starting user search with query:', query);
    console.log('🔍 Frontend: Search URL:', `${API_BASE_URL}/api/users/search?q=${encodeURIComponent(query)}`);
    
    const response = await fetch(`${API_BASE_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
      headers: await getAuthHeaders(),
    });
    
    const result = await handleResponse(response);
    console.log('🔍 Frontend: User search results:', result);
    console.log('🔍 Frontend: Found', result?.length || 0, 'users');
    
    return result;
  },

  async searchUserById(userId: string) {
    console.log('🔍 Frontend: Searching user by ID:', userId);
    console.log('🔍 Frontend: Search URL:', `${API_BASE_URL}/api/users/search/by-id/${encodeURIComponent(userId)}`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/search/by-id/${encodeURIComponent(userId)}`, {
        headers: await getAuthHeaders(),
      });
      
      console.log('🔍 Frontend: Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Network error" }));
        console.log('🔍 Frontend: Error response:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('🔍 Frontend: Search by ID result:', result);
      return result;
    } catch (error) {
      console.log('🔍 Frontend: Search by ID error:', error);
      throw error;
    }
  },

  async getSettings() {
    const response = await fetch(`${API_BASE_URL}/api/users/settings`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async updateSettings(settings: {
    lastSeenVisible?: boolean;
    profilePicVisible?: boolean;
    readReceiptsEnabled?: boolean;
    pushNotifications?: boolean;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/users/settings`, {
      method: "PUT",
      headers: await getAuthHeaders(),
      body: JSON.stringify(settings),
    });
    return handleResponse(response);
  },

  async updateSearchableStatus(searchable: boolean) {
    console.log('🔍 Frontend: Updating searchable status to:', searchable);
    console.log('🔍 Frontend: API URL:', `${API_BASE_URL}/api/users/settings/privacy`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/settings/privacy`, {
        method: "PATCH",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ searchable }),
      });
      
      console.log('🔍 Frontend: Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Network error" }));
        console.log('🔍 Frontend: Error response:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('🔍 Frontend: Update searchable status result:', result);
      return result;
    } catch (error) {
      console.log('🔍 Frontend: Update searchable status error:', error);
      throw error;
    }
  },

  async getBlockedUsers() {
    const response = await fetch(`${API_BASE_URL}/api/users/blocked`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async blockUser(userId: string) {
    const response = await fetch(`${API_BASE_URL}/api/users/block/${userId}`, {
      method: "POST",
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async unblockUser(userId: string) {
    const response = await fetch(`${API_BASE_URL}/api/users/block/${userId}`, {
      method: "DELETE",
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async updateStatus(isOnline: boolean) {
    const response = await fetch(`${API_BASE_URL}/api/users/status`, {
      method: "PUT",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ isOnline }),
    });
    return handleResponse(response);
  },
};

// Chats API
export const chatsAPI = {
  async getAllChats() {
    const response = await fetch(`${API_BASE_URL}/api/chats`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getChatById(chatId: string) {
    
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
        headers,
      });
      
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('🔍 Frontend: getChatById result:', result);
      return result;
    } catch (error) {
      console.log('🔍 Frontend: getChatById network error:', error);
      throw error;
    }
  },

  async createChat(chatData: {
    type: "private" | "group";
    name?: string;
    description?: string;
    participants: string[];
  }) {
    const response = await fetch(`${API_BASE_URL}/api/chats/create`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(chatData),
    });
    return handleResponse(response);
  },

  async findOrCreateChat(userId: string) {
    console.log('🔍 Frontend: Finding or creating chat with user:', userId);
    console.log('🔍 Frontend: API URL:', `${API_BASE_URL}/api/chats/find-or-create`);
    
    try {
      const headers = await getAuthHeaders();
      console.log('🔍 Frontend: Request headers:', headers);
      console.log('🔍 Frontend: Request body:', JSON.stringify({ userId }));
      
      const response = await fetch(`${API_BASE_URL}/api/chats/find-or-create`, {
        method: "POST",
        headers,
        body: JSON.stringify({ userId }),
      });
      
      console.log('🔍 Frontend: Response status:', response.status);
      console.log('🔍 Frontend: Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('🔍 Frontend: Error response text:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('🔍 Frontend: Find or create chat result:', result);
      return result;
    } catch (error) {
      console.log('🔍 Frontend: Network error details:', error);
      throw error;
    }
  },

  async updateChat(
    chatId: string,
    updateData: {
      name?: string;
      description?: string;
    },
  ) {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
      method: "PUT",
      headers: await getAuthHeaders(),
      body: JSON.stringify(updateData),
    });
    return handleResponse(response);
  },

  async addParticipant(chatId: string, userId: string, role = "member") {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/participants`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ userId, role }),
    });
    return handleResponse(response);
  },

  async removeParticipant(chatId: string, userId: string) {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/participants/${userId}`, {
      method: "DELETE",
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async deleteChat(chatId: string) {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
      method: "DELETE",
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async deleteManyChats(chatIds: string[]) {
    const response = await fetch(`${API_BASE_URL}/api/chats/delete-many`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ chatIds }),
    });
    return handleResponse(response);
  },
};

// Messages API
export const messagesAPI = {
  async getChatMessages(chatId: string, page = 1, limit = 20) {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages?page=${page}&limit=${limit}`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async sendMessage(
    chatId: string,
    messageData: {
      content: string;
      messageType: string;
      senderId: string;
      replyTo?: string;
    },
  ) {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(messageData),
    });
    return handleResponse(response);
  },

  async editMessage(messageId: string, content: string) {
    const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}`, {
      method: "PUT",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ content }),
    });
    return handleResponse(response);
  },

  async deleteMessage(messageId: string) {
    const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}`, {
      method: "DELETE",
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async markAsRead(messageId: string, userId: string) {
    const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}/read`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ userId }),
    });
    return handleResponse(response);
  },
};

// File Upload API
export const uploadAPI = {
  async uploadAvatar(file: any) {
    const formData = new FormData();
    formData.append("avatar", file);

    const token = await AsyncStorage.getItem("authToken");
    const response = await fetch(`${API_BASE_URL}/api/upload/avatar`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    return handleResponse(response);
  },

  async uploadChatMedia(file: any, chatId: string) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("chatId", chatId);

    const token = await AsyncStorage.getItem("authToken");
    const response = await fetch(`${API_BASE_URL}/api/upload/chat-media`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    return handleResponse(response);
  },
};

// Health Check API
export const healthAPI = {
  async check() {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return handleResponse(response);
  },
};

// Reactions API
export const reactionsAPI = {
  async addReaction(messageId: string, emoji: string) {
    const response = await fetch(`${API_BASE_URL}/api/reactions/messages/${messageId}/reactions`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ emoji }),
    });
    return handleResponse(response);
  },

  async removeReaction(messageId: string) {
    const response = await fetch(`${API_BASE_URL}/api/reactions/messages/${messageId}/reactions`, {
      method: "DELETE",
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getMessageReactions(messageId: string) {
    const response = await fetch(`${API_BASE_URL}/api/reactions/messages/${messageId}/reactions`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// Threads API
export const threadsAPI = {
  async createThread(messageId: string) {
    const response = await fetch(`${API_BASE_URL}/api/threads`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ messageId }),
    });
    return handleResponse(response);
  },

  async getThread(threadId: string) {
    const response = await fetch(`${API_BASE_URL}/api/threads/${threadId}`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getThreadMessages(threadId: string, page = 1, limit = 20) {
    const response = await fetch(`${API_BASE_URL}/api/threads/${threadId}/messages?page=${page}&limit=${limit}`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async sendThreadMessage(threadId: string, content: string, messageType = 'text') {
    const response = await fetch(`${API_BASE_URL}/api/threads/${threadId}/messages`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ content, messageType }),
    });
    return handleResponse(response);
  },

  async markThreadAsRead(threadId: string) {
    const response = await fetch(`${API_BASE_URL}/api/threads/${threadId}/read`, {
      method: "POST",
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async deleteThread(threadId: string) {
    const response = await fetch(`${API_BASE_URL}/api/threads/${threadId}`, {
      method: "DELETE",
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// Announcements API
export const announcementsAPI = {
  async getChatAnnouncements(chatId: string) {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/announcements`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async createAnnouncement(chatId: string, announcementData: {
    content: string;
    type: 'text' | 'event' | 'poll' | 'rules';
    pinned?: boolean;
    expiresAt?: string;
    metadata?: any;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/announcements`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(announcementData),
    });
    return handleResponse(response);
  },

  async updateAnnouncement(announcementId: string, announcementData: {
    content?: string;
    type?: 'text' | 'event' | 'poll' | 'rules';
    pinned?: boolean;
    expiresAt?: string;
    metadata?: any;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/announcements/${announcementId}`, {
      method: "PUT",
      headers: await getAuthHeaders(),
      body: JSON.stringify(announcementData),
    });
    return handleResponse(response);
  },

  async deleteAnnouncement(announcementId: string) {
    const response = await fetch(`${API_BASE_URL}/api/announcements/${announcementId}`, {
      method: "DELETE",
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async voteOnPoll(announcementId: string, optionIndexes: number[]) {
    const response = await fetch(`${API_BASE_URL}/api/announcements/${announcementId}/vote`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ optionIndexes }),
    });
    return handleResponse(response);
  },
};

// Voice Messages API
export const voiceMessagesAPI = {
  async uploadVoiceMessage(chatId: string, audioFile: any, duration: number) {
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('duration', duration.toString());
    formData.append('chatId', chatId);

    const token = await AsyncStorage.getItem("authToken");
    const response = await fetch(`${API_BASE_URL}/api/voice-messages/upload`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    return handleResponse(response);
  },

  async getVoiceMessage(voiceMessageId: string) {
    const response = await fetch(`${API_BASE_URL}/api/voice-messages/${voiceMessageId}`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async transcribeVoiceMessage(voiceMessageId: string) {
    const response = await fetch(`${API_BASE_URL}/api/voice-messages/${voiceMessageId}/transcribe`, {
      method: "POST",
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getTranscription(voiceMessageId: string) {
    const response = await fetch(`${API_BASE_URL}/api/voice-messages/${voiceMessageId}/transcription`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async markAsPlayed(voiceMessageId: string) {
    const response = await fetch(`${API_BASE_URL}/api/voice-messages/${voiceMessageId}/played`, {
      method: "POST",
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async deleteVoiceMessage(voiceMessageId: string) {
    const response = await fetch(`${API_BASE_URL}/api/voice-messages/${voiceMessageId}`, {
      method: "DELETE",
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// Group Management API
export const groupManagementAPI = {
  // Member Management
  async getChatMembers(chatId: string) {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/members`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async updateMemberRole(chatId: string, userId: string, role: 'admin' | 'moderator' | 'member') {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/members/${userId}/role`, {
      method: "PUT",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ role }),
    });
    return handleResponse(response);
  },

  async updateMemberPermissions(chatId: string, userId: string, permissions: any) {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/members/${userId}/permissions`, {
      method: "PUT",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ permissions }),
    });
    return handleResponse(response);
  },

  async kickMember(chatId: string, userId: string, reason?: string) {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/members/${userId}/kick`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
    return handleResponse(response);
  },

  async banMember(chatId: string, userId: string, reason?: string, expiresAt?: string) {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/members/${userId}/ban`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ reason, expiresAt }),
    });
    return handleResponse(response);
  },

  async unbanMember(chatId: string, userId: string) {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/members/${userId}/unban`, {
      method: "POST",
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getBannedMembers(chatId: string) {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/banned`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Group Settings
  async updateGroupSettings(chatId: string, settings: any) {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/settings`, {
      method: "PUT",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ settings }),
    });
    return handleResponse(response);
  },

  async updateGroupInfo(chatId: string, info: { name?: string; description?: string; avatar?: string }) {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/info`, {
      method: "PUT",
      headers: await getAuthHeaders(),
      body: JSON.stringify(info),
    });
    return handleResponse(response);
  },

  // Invite Management
  async createInvite(chatId: string, inviteData: { maxUses?: number; expiresAt?: string }) {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/invites`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(inviteData),
    });
    return handleResponse(response);
  },

  async getInvites(chatId: string) {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/invites`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async revokeInvite(chatId: string, inviteCode: string) {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/invites/${inviteCode}`, {
      method: "DELETE",
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async joinWithInvite(inviteCode: string) {
    const response = await fetch(`${API_BASE_URL}/api/chats/join/${inviteCode}`, {
      method: "POST",
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Message Management
  async pinMessage(chatId: string, messageId: string) {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages/${messageId}/pin`, {
      method: "POST",
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async unpinMessage(chatId: string, messageId: string) {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages/${messageId}/unpin`, {
      method: "POST",
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getPinnedMessages(chatId: string) {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/pinned`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Group Actions
  async leaveGroup(chatId: string) {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/leave`, {
      method: "POST",
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async deleteGroup(chatId: string) {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
      method: "DELETE",
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// Notifications API
export const notificationsAPI = {
  async getPreferences(userId: string) {
    const response = await fetch(`${API_BASE_URL}/api/notifications/preferences/${userId}`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async updatePreferences(userId: string, preferences: {
    push?: {
      enabled?: boolean;
      sound?: boolean;
      preview?: boolean;
    };
    email?: {
      enabled?: boolean;
      marketing?: boolean;
    };
  }) {
    const response = await fetch(`${API_BASE_URL}/api/notifications/preferences/${userId}`, {
      method: "PUT",
      headers: await getAuthHeaders(),
      body: JSON.stringify(preferences),
    });
    return handleResponse(response);
  },

  async sendTestNotification(userId: string) {
    const response = await fetch(`${API_BASE_URL}/api/notifications/test`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ userId }),
    });
    return handleResponse(response);
  },
};

// Export individual functions for easier imports
export const sendMessage = messagesAPI.sendMessage;
export const getMessages = messagesAPI.getChatMessages;
export const editMessage = messagesAPI.editMessage;
export const deleteMessage = messagesAPI.deleteMessage;
export const findOrCreateChat = chatsAPI.findOrCreateChat;
export const addReaction = reactionsAPI.addReaction;
export const removeReaction = reactionsAPI.removeReaction;
export const createThread = threadsAPI.createThread;
export const getThread = threadsAPI.getThread;
export const sendThreadMessage = threadsAPI.sendThreadMessage;
export const getChatAnnouncements = announcementsAPI.getChatAnnouncements;
export const createAnnouncement = announcementsAPI.createAnnouncement;
export const voteOnPoll = announcementsAPI.voteOnPoll;
export const uploadVoiceMessage = voiceMessagesAPI.uploadVoiceMessage;
export const transcribeVoiceMessage = voiceMessagesAPI.transcribeVoiceMessage;
export const markAsPlayed = voiceMessagesAPI.markAsPlayed;
export const getChatMembers = groupManagementAPI.getChatMembers;
export const updateMemberRole = groupManagementAPI.updateMemberRole;
export const kickMember = groupManagementAPI.kickMember;
export const banMember = groupManagementAPI.banMember;
export const updateGroupSettings = groupManagementAPI.updateGroupSettings;
export const createInvite = groupManagementAPI.createInvite;
export const pinMessage = groupManagementAPI.pinMessage;