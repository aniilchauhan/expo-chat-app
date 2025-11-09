import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../utils/auth';

export const reactionsApi = {
  async addReaction(messageId: string, emoji: string) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/reactions/messages/${messageId}/reactions`,
        {
          method: 'POST',
          headers: await getAuthHeaders(),
          body: JSON.stringify({ emoji }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add reaction');
      }

      return response.json();
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  },

  async removeReaction(messageId: string) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/reactions/messages/${messageId}/reactions`,
        {
          method: 'DELETE',
          headers: await getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to remove reaction');
      }

      return response.json();
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  },

  async getMessageReactions(messageId: string) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/reactions/messages/${messageId}/reactions`,
        {
          headers: await getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get reactions');
      }

      return response.json();
    } catch (error) {
      console.error('Error getting reactions:', error);
      throw error;
    }
  },
};
