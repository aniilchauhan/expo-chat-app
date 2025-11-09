import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { groupManagementAPI } from '../../api';
import { ChatParticipant, User, Chat } from '../../types';

interface MemberManagementProps {
  chat: Chat;
  currentUserId: string;
  isVisible: boolean;
  onClose: () => void;
  onMemberUpdate?: () => void;
}

export const MemberManagement: React.FC<MemberManagementProps> = ({
  chat,
  currentUserId,
  isVisible,
  onClose,
  onMemberUpdate,
}) => {
  const { theme } = useTheme();
  const [members, setMembers] = useState<ChatParticipant[]>([]);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<ChatParticipant | null>(null);
  const [showMemberActions, setShowMemberActions] = useState(false);
  const [showBannedUsers, setShowBannedUsers] = useState(false);

  const currentUserRole = chat.participants.find(p => p.userId._id === currentUserId)?.role || 'member';
  const currentUserPermissions = chat.participants.find(p => p.userId._id === currentUserId)?.permissions;

  useEffect(() => {
    if (isVisible) {
      loadMembers();
      loadBannedUsers();
    }
  }, [isVisible, chat._id]);

  const loadMembers = async () => {
    try {
      setIsLoading(true);
      const response = await groupManagementAPI.getChatMembers(chat._id);
      if (response.success) {
        setMembers(response.members || []);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBannedUsers = async () => {
    try {
      const response = await groupManagementAPI.getBannedMembers(chat._id);
      if (response.success) {
        setBannedUsers(response.bannedUsers || []);
      }
    } catch (error) {
      console.error('Error loading banned users:', error);
    }
  };

  const handleRoleChange = async (member: ChatParticipant, newRole: 'admin' | 'moderator' | 'member') => {
    if (!canChangeRole(member)) {
      Alert.alert('Permission Denied', 'You do not have permission to change this member\'s role.');
      return;
    }

    Alert.alert(
      'Change Role',
      `Are you sure you want to change ${member.userId.firstName}'s role to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const response = await groupManagementAPI.updateMemberRole(chat._id, member.userId._id, newRole);
              if (response.success) {
                loadMembers();
                onMemberUpdate?.();
                setShowMemberActions(false);
              } else {
                Alert.alert('Error', response.message || 'Failed to update role');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to update member role');
            }
          },
        },
      ]
    );
  };

  const handleKickMember = async (member: ChatParticipant) => {
    if (!canKickMember(member)) {
      Alert.alert('Permission Denied', 'You do not have permission to kick this member.');
      return;
    }

    Alert.prompt(
      'Kick Member',
      `Enter reason for kicking ${member.userId.firstName} (optional):`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Kick',
          style: 'destructive',
          onPress: async (reason) => {
            try {
              const response = await groupManagementAPI.kickMember(chat._id, member.userId._id, reason);
              if (response.success) {
                loadMembers();
                onMemberUpdate?.();
                setShowMemberActions(false);
              } else {
                Alert.alert('Error', response.message || 'Failed to kick member');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to kick member');
            }
          },
        },
      ]
    );
  };

  const handleBanMember = async (member: ChatParticipant) => {
    if (!canBanMember(member)) {
      Alert.alert('Permission Denied', 'You do not have permission to ban this member.');
      return;
    }

    Alert.prompt(
      'Ban Member',
      `Enter reason for banning ${member.userId.firstName} (optional):`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban',
          style: 'destructive',
          onPress: async (reason) => {
            try {
              const response = await groupManagementAPI.banMember(chat._id, member.userId._id, reason);
              if (response.success) {
                loadMembers();
                loadBannedUsers();
                onMemberUpdate?.();
                setShowMemberActions(false);
              } else {
                Alert.alert('Error', response.message || 'Failed to ban member');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to ban member');
            }
          },
        },
      ]
    );
  };

  const handleUnbanUser = async (bannedUser: any) => {
    Alert.alert(
      'Unban User',
      `Are you sure you want to unban ${bannedUser.userId.firstName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unban',
          onPress: async () => {
            try {
              const response = await groupManagementAPI.unbanMember(chat._id, bannedUser.userId._id);
              if (response.success) {
                loadBannedUsers();
                onMemberUpdate?.();
              } else {
                Alert.alert('Error', response.message || 'Failed to unban user');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to unban user');
            }
          },
        },
      ]
    );
  };

  const canChangeRole = (member: ChatParticipant): boolean => {
    if (member.userId._id === currentUserId) return false;
    if (member.role === 'owner') return false;
    if (currentUserRole === 'owner') return true;
    if (currentUserRole === 'admin' && member.role !== 'admin') return true;
    return false;
  };

  const canKickMember = (member: ChatParticipant): boolean => {
    if (member.userId._id === currentUserId) return false;
    if (member.role === 'owner') return false;
    if (currentUserRole === 'owner') return true;
    if (currentUserRole === 'admin' && member.role !== 'admin') return true;
    if (currentUserPermissions?.canKick && member.role === 'member') return true;
    return false;
  };

  const canBanMember = (member: ChatParticipant): boolean => {
    if (member.userId._id === currentUserId) return false;
    if (member.role === 'owner') return false;
    if (currentUserRole === 'owner') return true;
    if (currentUserRole === 'admin' && member.role !== 'admin') return true;
    if (currentUserPermissions?.canBan && member.role === 'member') return true;
    return false;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return '#FF6B35';
      case 'admin':
        return '#FF3B30';
      case 'moderator':
        return '#FF9500';
      case 'member':
        return theme.colors.textSecondary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return 'crown';
      case 'admin':
        return 'shield-checkmark';
      case 'moderator':
        return 'shield';
      case 'member':
        return 'person';
      default:
        return 'person';
    }
  };

  const filteredMembers = members.filter(member =>
    member.userId.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.userId.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.userId.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMemberItem = ({ item }: { item: ChatParticipant }) => (
    <TouchableOpacity
      style={[styles.memberItem, { backgroundColor: theme.colors.surface }]}
      onPress={() => {
        setSelectedMember(item);
        setShowMemberActions(true);
      }}
    >
      <View style={styles.memberInfo}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.avatarText, { color: 'white' }]}>
            {item.userId.firstName[0]}{item.userId.lastName[0]}
          </Text>
        </View>
        <View style={styles.memberDetails}>
          <Text style={[styles.memberName, { color: theme.colors.text }]}>
            {item.userId.firstName} {item.userId.lastName}
          </Text>
          <Text style={[styles.memberUsername, { color: theme.colors.textSecondary }]}>
            @{item.userId.username}
          </Text>
        </View>
      </View>
      <View style={styles.memberActions}>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
          <Ionicons name={getRoleIcon(item.role) as any} size={12} color="white" />
          <Text style={styles.roleText}>{item.role}</Text>
        </View>
        {item.isOnline && (
          <View style={[styles.onlineIndicator, { backgroundColor: '#4CAF50' }]} />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderBannedUserItem = ({ item }: { item: any }) => (
    <View style={[styles.memberItem, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.memberInfo}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.error }]}>
          <Text style={[styles.avatarText, { color: 'white' }]}>
            {item.userId.firstName[0]}{item.userId.lastName[0]}
          </Text>
        </View>
        <View style={styles.memberDetails}>
          <Text style={[styles.memberName, { color: theme.colors.text }]}>
            {item.userId.firstName} {item.userId.lastName}
          </Text>
          <Text style={[styles.memberUsername, { color: theme.colors.textSecondary }]}>
            @{item.userId.username}
          </Text>
          {item.reason && (
            <Text style={[styles.banReason, { color: theme.colors.textSecondary }]}>
              Reason: {item.reason}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[styles.unbanButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => handleUnbanUser(item)}
      >
        <Ionicons name="checkmark" size={16} color="white" />
      </TouchableOpacity>
    </View>
  );

  const renderMemberActions = () => (
    <Modal
      visible={showMemberActions}
      transparent
      animationType="slide"
      onRequestClose={() => setShowMemberActions(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.actionsModal, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.actionsTitle, { color: theme.colors.text }]}>
            {selectedMember?.userId.firstName} {selectedMember?.userId.lastName}
          </Text>
          
          {canChangeRole(selectedMember!) && (
            <View style={styles.actionSection}>
              <Text style={[styles.actionSectionTitle, { color: theme.colors.text }]}>
                Change Role
              </Text>
              {['admin', 'moderator', 'member'].map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.actionButton,
                    selectedMember?.role === role && { backgroundColor: theme.colors.primary }
                  ]}
                  onPress={() => handleRoleChange(selectedMember!, role as any)}
                >
                  <Ionicons name={getRoleIcon(role) as any} size={20} color={theme.colors.text} />
                  <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
                    Make {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.actionSection}>
            <Text style={[styles.actionSectionTitle, { color: theme.colors.text }]}>
              Actions
            </Text>
            {canKickMember(selectedMember!) && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#FF9500' }]}
                onPress={() => handleKickMember(selectedMember!)}
              >
                <Ionicons name="exit" size={20} color="white" />
                <Text style={[styles.actionButtonText, { color: 'white' }]}>
                  Kick Member
                </Text>
              </TouchableOpacity>
            )}
            {canBanMember(selectedMember!) && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
                onPress={() => handleBanMember(selectedMember!)}
              >
                <Ionicons name="ban" size={20} color="white" />
                <Text style={[styles.actionButtonText, { color: 'white' }]}>
                  Ban Member
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: theme.colors.disabled }]}
            onPress={() => setShowMemberActions(false)}
          >
            <Text style={[styles.closeButtonText, { color: theme.colors.text }]}>
              Close
            </Text>
          </TouchableOpacity>
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
          {showBannedUsers ? 'Banned Members' : 'Group Members'}
        </Text>
        <TouchableOpacity
          onPress={() => setShowBannedUsers(!showBannedUsers)}
          style={styles.toggleButton}
        >
          <Ionicons
            name={showBannedUsers ? 'people' : 'ban'}
            size={24}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      {!showBannedUsers && (
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search members..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={showBannedUsers ? bannedUsers : filteredMembers}
          keyExtractor={(item) => item.userId._id}
          renderItem={showBannedUsers ? renderBannedUserItem : renderMemberItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {renderMemberActions()}
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
  toggleButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
  },
  memberUsername: {
    fontSize: 14,
    marginTop: 2,
  },
  banReason: {
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  roleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  unbanButton: {
    padding: 8,
    borderRadius: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsModal: {
    width: '80%',
    borderRadius: 12,
    padding: 20,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  actionSection: {
    marginBottom: 20,
  },
  actionSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 16,
    marginLeft: 12,
  },
  closeButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
