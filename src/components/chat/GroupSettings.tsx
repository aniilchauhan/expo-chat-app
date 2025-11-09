import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { groupManagementAPI } from '../../api';
import { Chat, ChatSettings } from '../../types';

interface GroupSettingsProps {
  chat: Chat;
  currentUserId: string;
  isVisible: boolean;
  onClose: () => void;
  onSettingsUpdate?: () => void;
}

export const GroupSettings: React.FC<GroupSettingsProps> = ({
  chat,
  currentUserId,
  isVisible,
  onClose,
  onSettingsUpdate,
}) => {
  const { theme } = useTheme();
  const [settings, setSettings] = useState<ChatSettings>(chat.settings);
  const [groupInfo, setGroupInfo] = useState({
    name: chat.name || '',
    description: chat.description || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showEditInfo, setShowEditInfo] = useState(false);

  const currentUserRole = chat.participants.find(p => p.userId._id === currentUserId)?.role || 'member';
  const currentUserPermissions = chat.participants.find(p => p.userId._id === currentUserId)?.permissions;
  const isOwner = currentUserRole === 'owner';
  const isAdmin = currentUserRole === 'admin' || isOwner;
  const canEditInfo = isAdmin || currentUserPermissions?.canEditInfo;

  useEffect(() => {
    if (isVisible) {
      setSettings(chat.settings);
      setGroupInfo({
        name: chat.name || '',
        description: chat.description || '',
      });
    }
  }, [isVisible, chat]);

  const handleSettingChange = async (key: keyof ChatSettings, value: any) => {
    if (!isAdmin) {
      Alert.alert('Permission Denied', 'Only admins can change group settings.');
      return;
    }

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      const response = await groupManagementAPI.updateGroupSettings(chat._id, newSettings);
      if (!response.success) {
        // Revert on failure
        setSettings(settings);
        Alert.alert('Error', response.message || 'Failed to update settings');
      } else {
        onSettingsUpdate?.();
      }
    } catch (error) {
      // Revert on failure
      setSettings(settings);
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const handleInfoUpdate = async () => {
    if (!canEditInfo) {
      Alert.alert('Permission Denied', 'You do not have permission to edit group information.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await groupManagementAPI.updateGroupInfo(chat._id, groupInfo);
      if (response.success) {
        setShowEditInfo(false);
        onSettingsUpdate?.();
      } else {
        Alert.alert('Error', response.message || 'Failed to update group information');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update group information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await groupManagementAPI.leaveGroup(chat._id);
              if (response.success) {
                onClose();
                // Navigate back to chat list
              } else {
                Alert.alert('Error', response.message || 'Failed to leave group');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to leave group');
            }
          },
        },
      ]
    );
  };

  const handleDeleteGroup = () => {
    if (!isOwner) {
      Alert.alert('Permission Denied', 'Only the group owner can delete the group.');
      return;
    }

    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await groupManagementAPI.deleteGroup(chat._id);
              if (response.success) {
                onClose();
                // Navigate back to chat list
              } else {
                Alert.alert('Error', response.message || 'Failed to delete group');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete group');
            }
          },
        },
      ]
    );
  };

  const renderSettingRow = (
    title: string,
    description: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    disabled: boolean = false
  ) => (
    <View style={[styles.settingRow, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
        thumbColor={value ? '#fff' : theme.colors.textSecondary}
      />
    </View>
  );

  const renderEditInfoModal = () => (
    <Modal
      visible={showEditInfo}
      transparent
      animationType="slide"
      onRequestClose={() => setShowEditInfo(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.editModal, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            Edit Group Information
          </Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Group Name
            </Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                borderColor: theme.colors.disabled
              }]}
              value={groupInfo.name}
              onChangeText={(text) => setGroupInfo({ ...groupInfo, name: text })}
              placeholder="Enter group name"
              placeholderTextColor={theme.colors.textSecondary}
              maxLength={50}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Description
            </Text>
            <TextInput
              style={[styles.textArea, { 
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                borderColor: theme.colors.disabled
              }]}
              value={groupInfo.description}
              onChangeText={(text) => setGroupInfo({ ...groupInfo, description: text })}
              placeholder="Enter group description"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.disabled }]}
              onPress={() => setShowEditInfo(false)}
            >
              <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleInfoUpdate}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={[styles.modalButtonText, { color: 'white' }]}>
                  Save
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
          Group Settings
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Group Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Group Information
          </Text>
          
          <TouchableOpacity
            style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => canEditInfo && setShowEditInfo(true)}
            disabled={!canEditInfo}
          >
            <View style={styles.infoContent}>
              <Text style={[styles.groupName, { color: theme.colors.text }]}>
                {chat.name || 'Unnamed Group'}
              </Text>
              <Text style={[styles.groupDescription, { color: theme.colors.textSecondary }]}>
                {chat.description || 'No description'}
              </Text>
              <Text style={[styles.memberCount, { color: theme.colors.textSecondary }]}>
                {chat.participants.length} members
              </Text>
            </View>
            {canEditInfo && (
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Privacy Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Privacy & Access
          </Text>
          
          {renderSettingRow(
            'Public Group',
            'Allow anyone to find and join this group',
            settings.isPublic,
            (value) => handleSettingChange('isPublic', value),
            !isAdmin
          )}
          
          {renderSettingRow(
            'Join Requires Approval',
            'New members need admin approval to join',
            settings.joinRequiresApproval,
            (value) => handleSettingChange('joinRequiresApproval', value),
            !isAdmin
          )}
          
          {renderSettingRow(
            'Only Admins Can Invite',
            'Restrict invitation privileges to admins only',
            settings.onlyAdminsCanInvite,
            (value) => handleSettingChange('onlyAdminsCanInvite', value),
            !isAdmin
          )}
        </View>

        {/* Messaging Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Messaging
          </Text>
          
          {renderSettingRow(
            'Only Admins Can Message',
            'Restrict messaging to admins only',
            settings.onlyAdminsCanMessage,
            (value) => handleSettingChange('onlyAdminsCanMessage', value),
            !isAdmin
          )}
          
          <View style={[styles.settingRow, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                Slow Mode
              </Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                {settings.slowMode > 0 
                  ? `Members can send messages every ${settings.slowMode} seconds`
                  : 'No message cooldown'
                }
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.slowModeButton, { borderColor: theme.colors.primary }]}
              onPress={() => {
                if (!isAdmin) {
                  Alert.alert('Permission Denied', 'Only admins can change slow mode settings.');
                  return;
                }
                
                const options = [0, 5, 10, 30, 60, 300];
                const currentIndex = options.indexOf(settings.slowMode);
                const nextIndex = (currentIndex + 1) % options.length;
                handleSettingChange('slowMode', options[nextIndex]);
              }}
              disabled={!isAdmin}
            >
              <Text style={[styles.slowModeText, { color: theme.colors.primary }]}>
                {settings.slowMode > 0 ? `${settings.slowMode}s` : 'Off'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Group Limits */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Group Limits
          </Text>
          
          <View style={[styles.settingRow, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                Maximum Members
              </Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                Current limit: {settings.maxParticipants} members
              </Text>
            </View>
            <Text style={[styles.limitText, { color: theme.colors.textSecondary }]}>
              {settings.maxParticipants}
            </Text>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.error }]}>
            Danger Zone
          </Text>
          
          <TouchableOpacity
            style={[styles.dangerButton, { backgroundColor: '#FF9500' }]}
            onPress={handleLeaveGroup}
          >
            <Ionicons name="exit" size={20} color="white" />
            <Text style={[styles.dangerButtonText, { color: 'white' }]}>
              Leave Group
            </Text>
          </TouchableOpacity>
          
          {isOwner && (
            <TouchableOpacity
              style={[styles.dangerButton, { backgroundColor: theme.colors.error }]}
              onPress={handleDeleteGroup}
            >
              <Ionicons name="trash" size={20} color="white" />
              <Text style={[styles.dangerButtonText, { color: 'white' }]}>
                Delete Group
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {renderEditInfoModal()}
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
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  infoContent: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 12,
  },
  slowModeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 16,
  },
  slowModeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  limitText: {
    fontSize: 16,
    fontWeight: '500',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModal: {
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
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 80,
    textAlignVertical: 'top',
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
