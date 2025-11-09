import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { groupManagementAPI } from '../../api';
import { Chat, ChatInvite } from '../../types';
import * as Clipboard from 'expo-clipboard';

interface InviteManagementProps {
  chat: Chat;
  currentUserId: string;
  isVisible: boolean;
  onClose: () => void;
  onInviteUpdate?: () => void;
}

export const InviteManagement: React.FC<InviteManagementProps> = ({
  chat,
  currentUserId,
  isVisible,
  onClose,
  onInviteUpdate,
}) => {
  const { theme } = useTheme();
  const [invites, setInvites] = useState<ChatInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateInvite, setShowCreateInvite] = useState(false);
  const [newInviteData, setNewInviteData] = useState({
    maxUses: 0,
    expiresAt: '',
  });

  const currentUserRole = chat.participants.find(p => p.userId._id === currentUserId)?.role || 'member';
  const currentUserPermissions = chat.participants.find(p => p.userId._id === currentUserId)?.permissions;
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'owner';
  const canCreateInvites = isAdmin || currentUserPermissions?.canInvite;

  useEffect(() => {
    if (isVisible) {
      loadInvites();
    }
  }, [isVisible, chat._id]);

  const loadInvites = async () => {
    try {
      setIsLoading(true);
      const response = await groupManagementAPI.getInvites(chat._id);
      if (response.success) {
        setInvites(response.invites || []);
      }
    } catch (error) {
      console.error('Error loading invites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!canCreateInvites) {
      Alert.alert('Permission Denied', 'You do not have permission to create invites.');
      return;
    }

    setIsLoading(true);
    try {
      const inviteData = {
        maxUses: newInviteData.maxUses > 0 ? newInviteData.maxUses : undefined,
        expiresAt: newInviteData.expiresAt || undefined,
      };

      const response = await groupManagementAPI.createInvite(chat._id, inviteData);
      if (response.success) {
        setShowCreateInvite(false);
        setNewInviteData({ maxUses: 0, expiresAt: '' });
        loadInvites();
        onInviteUpdate?.();
      } else {
        Alert.alert('Error', response.message || 'Failed to create invite');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create invite');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyInvite = async (inviteCode: string) => {
    try {
      const inviteLink = `${process.env.EXPO_PUBLIC_APP_URL || 'https://yourapp.com'}/join/${inviteCode}`;
      await Clipboard.setStringAsync(inviteLink);
      Alert.alert('Copied', 'Invite link copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy invite link');
    }
  };

  const handleRevokeInvite = async (inviteCode: string) => {
    Alert.alert(
      'Revoke Invite',
      'Are you sure you want to revoke this invite?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await groupManagementAPI.revokeInvite(chat._id, inviteCode);
              if (response.success) {
                loadInvites();
                onInviteUpdate?.();
              } else {
                Alert.alert('Error', response.message || 'Failed to revoke invite');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to revoke invite');
            }
          },
        },
      ]
    );
  };

  const isInviteExpired = (invite: ChatInvite): boolean => {
    if (!invite.expiresAt) return false;
    return new Date(invite.expiresAt) < new Date();
  };

  const isInviteMaxedOut = (invite: ChatInvite): boolean => {
    if (invite.maxUses === 0) return false; // Unlimited uses
    return invite.uses >= invite.maxUses;
  };

  const getInviteStatus = (invite: ChatInvite): { status: string; color: string } => {
    if (isInviteExpired(invite)) {
      return { status: 'Expired', color: theme.colors.error };
    }
    if (isInviteMaxedOut(invite)) {
      return { status: 'Max Uses', color: '#FF9500' };
    }
    return { status: 'Active', color: '#4CAF50' };
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderInviteItem = ({ item }: { item: ChatInvite }) => {
    const inviteStatus = getInviteStatus(item);
    
    return (
      <View style={[styles.inviteItem, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.inviteInfo}>
          <View style={styles.inviteHeader}>
            <Text style={[styles.inviteCode, { color: theme.colors.text }]}>
              {item.code}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: inviteStatus.color }]}>
              <Text style={styles.statusText}>{inviteStatus.status}</Text>
            </View>
          </View>
          
          <Text style={[styles.inviteDetails, { color: theme.colors.textSecondary }]}>
            Created by {item.createdBy.firstName} {item.createdBy.lastName}
          </Text>
          
          <Text style={[styles.inviteDetails, { color: theme.colors.textSecondary }]}>
            Uses: {item.uses}{item.maxUses > 0 ? `/${item.maxUses}` : ' (unlimited)'}
          </Text>
          
          {item.expiresAt && (
            <Text style={[styles.inviteDetails, { color: theme.colors.textSecondary }]}>
              Expires: {formatDate(item.expiresAt)}
            </Text>
          )}
        </View>
        
        <View style={styles.inviteActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => handleCopyInvite(item.code)}
          >
            <Ionicons name="copy" size={16} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
            onPress={() => handleRevokeInvite(item.code)}
          >
            <Ionicons name="close" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCreateInviteModal = () => (
    <Modal
      visible={showCreateInvite}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCreateInvite(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.createModal, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            Create Invite Link
          </Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Maximum Uses (0 = unlimited)
            </Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                borderColor: theme.colors.disabled
              }]}
              value={newInviteData.maxUses.toString()}
              onChangeText={(text) => setNewInviteData({ 
                ...newInviteData, 
                maxUses: parseInt(text) || 0 
              })}
              placeholder="0"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Expiration Date (optional)
            </Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                borderColor: theme.colors.disabled
              }]}
              value={newInviteData.expiresAt}
              onChangeText={(text) => setNewInviteData({ ...newInviteData, expiresAt: text })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.disabled }]}
              onPress={() => setShowCreateInvite(false)}
            >
              <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleCreateInvite}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={[styles.modalButtonText, { color: 'white' }]}>
                  Create
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (!isVisible) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Invite Links
        </Text>
        {canCreateInvites && (
          <TouchableOpacity
            onPress={() => setShowCreateInvite(true)}
            style={styles.createButton}
          >
            <Ionicons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={invites}
          keyExtractor={(item) => item.code}
          renderItem={renderInviteItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="link" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No invite links created
              </Text>
              {canCreateInvites && (
                <TouchableOpacity
                  style={[styles.createFirstButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => setShowCreateInvite(true)}
                >
                  <Text style={styles.createFirstButtonText}>Create First Invite</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {renderCreateInviteModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  createButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  inviteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  inviteInfo: {
    flex: 1,
    marginRight: 12,
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  inviteCode: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  inviteDetails: {
    fontSize: 14,
    marginBottom: 2,
  },
  inviteActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  createFirstButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createFirstButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createModal: {
    width: '90%',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
