import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { announcementsAPI } from '../../api';
import { Announcement } from '../../types';
import { CreateAnnouncementDialog } from './CreateAnnouncementDialog';

interface AnnouncementListProps {
  chatId: string;
  currentUserId: string;
  userRole: string;
  onClose: () => void;
}

export const AnnouncementList: React.FC<AnnouncementListProps> = ({
  chatId,
  currentUserId,
  userRole,
  onClose,
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const canManageAnnouncements = ['owner', 'admin', 'moderator'].includes(userRole);

  useEffect(() => {
    fetchAnnouncements();
  }, [chatId]);

  const fetchAnnouncements = async () => {
    try {
      const response = await announcementsAPI.getChatAnnouncements(chatId);
      if (response.success) {
        setAnnouncements(response.announcements || []);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      Alert.alert('Error', 'Could not load announcements');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (announcementId: string) => {
    Alert.alert(
      'Delete Announcement',
      'Are you sure you want to delete this announcement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await announcementsAPI.deleteAnnouncement(announcementId);
              setAnnouncements(prev => prev.filter(a => a._id !== announcementId));
              Alert.alert('Success', 'Announcement deleted');
            } catch (error) {
              console.error('Error deleting announcement:', error);
              Alert.alert('Error', 'Could not delete announcement');
            }
          },
        },
      ]
    );
  };

  const handleVote = async (announcementId: string, optionIndexes: number[]) => {
    try {
      const response = await announcementsAPI.voteOnPoll(announcementId, optionIndexes);
      if (response.success) {
        setAnnouncements(prev =>
          prev.map(a => (a._id === announcementId ? response.announcement : a))
        );
      }
    } catch (error) {
      console.error('Error voting:', error);
      Alert.alert('Error', 'Could not submit vote');
    }
  };

  const renderPoll = (announcement: Announcement) => {
    if (!announcement.metadata?.options) return null;

    const totalVotes = announcement.metadata.options.reduce(
      (sum, option) => sum + option.votes.length,
      0
    );

    const hasVoted = announcement.metadata.options.some(option =>
      option.votes.some(vote => vote.userId === currentUserId)
    );

    const isPollEnded = announcement.metadata.endDate 
      ? new Date(announcement.metadata.endDate) < new Date()
      : false;

    return (
      <View style={styles.pollContainer}>
        {announcement.metadata.options.map((option, index) => {
          const voteCount = option.votes.length;
          const percentage = totalVotes ? (voteCount / totalVotes) * 100 : 0;
          const hasUserVoted = option.votes.some(
            vote => vote.userId === currentUserId
          );

          return (
            <View key={index} style={styles.pollOption}>
              <View style={styles.pollOptionHeader}>
                <Text style={styles.pollOptionText}>{option.text}</Text>
                <Text style={styles.pollVoteCount}>{voteCount} votes</Text>
              </View>
              <View style={styles.pollProgressContainer}>
                <View style={[styles.pollProgress, { width: `${percentage}%` }]} />
                {hasUserVoted && (
                  <Text style={styles.pollUserVote}>Your vote</Text>
                )}
              </View>
            </View>
          );
        })}

        {!hasVoted && !isPollEnded && (
          <View style={styles.pollVoteButtons}>
            {announcement.metadata.options.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={styles.pollVoteButton}
                onPress={() => handleVote(announcement._id, [index])}
              >
                <Text style={styles.pollVoteButtonText}>Vote Option {index + 1}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {isPollEnded && (
          <View style={styles.pollEndedContainer}>
            <Ionicons name="warning" size={16} color="#666" />
            <Text style={styles.pollEndedText}>This poll has ended</Text>
          </View>
        )}
      </View>
    );
  };

  const renderEvent = (announcement: Announcement) => {
    if (!announcement.metadata?.eventDate) return null;

    const eventDate = new Date(announcement.metadata.eventDate);
    const isUpcoming = eventDate > new Date();

    return (
      <View style={styles.eventContainer}>
        <View style={styles.eventDetail}>
          <Ionicons name="calendar" size={16} color="#007AFF" />
          <Text style={styles.eventText}>{format(eventDate, 'PPP p')}</Text>
        </View>
        {announcement.metadata.location && (
          <View style={styles.eventDetail}>
            <Ionicons name="location" size={16} color="#007AFF" />
            <Text style={styles.eventText}>{announcement.metadata.location}</Text>
          </View>
        )}
        {isUpcoming && (
          <TouchableOpacity style={styles.addToCalendarButton}>
            <Text style={styles.addToCalendarText}>Add to Calendar</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderAnnouncement = ({ item }: { item: Announcement }) => (
    <View style={styles.announcementCard}>
      <View style={styles.announcementHeader}>
        <View style={styles.announcementInfo}>
          {item.type === 'text' && <Ionicons name="notifications" size={20} color="#007AFF" />}
          {item.type === 'event' && <Ionicons name="calendar" size={20} color="#007AFF" />}
          {item.type === 'poll' && <Ionicons name="bar-chart" size={20} color="#007AFF" />}
          {item.type === 'rules' && <Ionicons name="document-text" size={20} color="#007AFF" />}
          
          <View style={styles.announcementMeta}>
            <View style={styles.announcementAuthor}>
              <Text style={styles.announcementAuthorName}>{item.createdBy.name}</Text>
              {item.pinned && <Ionicons name="pin" size={16} color="#007AFF" />}
            </View>
            <Text style={styles.announcementDate}>
              {format(new Date(item.createdAt), 'PP p')}
            </Text>
          </View>
        </View>

        {(canManageAnnouncements || item.createdBy._id === currentUserId) && (
          <View style={styles.announcementActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setEditingAnnouncement(item)}
            >
              <Ionicons name="pencil" size={16} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(item._id)}
            >
              <Ionicons name="trash" size={16} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={styles.announcementContent}>{item.content}</Text>

      {item.type === 'poll' && renderPoll(item)}
      {item.type === 'event' && renderEvent(item)}

      {item.expiresAt && (
        <View style={styles.expiryContainer}>
          <Ionicons name="time" size={16} color="#666" />
          <Text style={styles.expiryText}>
            Expires {format(new Date(item.expiresAt), 'PP p')}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Announcements</Text>
        {canManageAnnouncements && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateDialog(true)}
          >
            <Ionicons name="add" size={20} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading announcements...</Text>
        </View>
      ) : announcements.length > 0 ? (
        <FlatList
          data={announcements}
          renderItem={renderAnnouncement}
          keyExtractor={(item) => item._id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No announcements yet</Text>
        </View>
      )}

      <CreateAnnouncementDialog
        chatId={chatId}
        isVisible={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          setEditingAnnouncement(null);
        }}
        onCreated={(newAnnouncement) => {
          setAnnouncements(prev => [newAnnouncement, ...prev]);
          setShowCreateDialog(false);
        }}
        onEdited={(updatedAnnouncement) => {
          setAnnouncements(prev =>
            prev.map(a =>
              a._id === updatedAnnouncement._id ? updatedAnnouncement : a
            )
          );
          setEditingAnnouncement(null);
        }}
        announcement={editingAnnouncement}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  createButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  announcementCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  announcementInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  announcementMeta: {
    marginLeft: 12,
    flex: 1,
  },
  announcementAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  announcementAuthorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  announcementDate: {
    fontSize: 12,
    color: '#666',
  },
  announcementActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  announcementContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  pollContainer: {
    marginTop: 12,
  },
  pollOption: {
    marginBottom: 12,
  },
  pollOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pollOptionText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  pollVoteCount: {
    fontSize: 12,
    color: '#666',
  },
  pollProgressContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    position: 'relative',
  },
  pollProgress: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  pollUserVote: {
    position: 'absolute',
    right: 8,
    top: -20,
    fontSize: 10,
    color: '#007AFF',
    fontWeight: '500',
  },
  pollVoteButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  pollVoteButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  pollVoteButtonText: {
    fontSize: 12,
    color: '#007AFF',
  },
  pollEndedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  pollEndedText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  eventContainer: {
    marginTop: 12,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  addToCalendarButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  addToCalendarText: {
    fontSize: 12,
    color: '#007AFF',
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  expiryText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
});
