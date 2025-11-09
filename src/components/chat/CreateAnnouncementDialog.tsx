import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { announcementsAPI } from '../../api';
import { Announcement } from '../../types';

interface CreateAnnouncementDialogProps {
  chatId: string;
  isVisible: boolean;
  onClose: () => void;
  onCreated: (announcement: Announcement) => void;
  onEdited?: (announcement: Announcement) => void;
  announcement?: Announcement | null;
}

export const CreateAnnouncementDialog: React.FC<CreateAnnouncementDialogProps> = ({
  chatId,
  isVisible,
  onClose,
  onCreated,
  onEdited,
  announcement,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState<'text' | 'event' | 'poll' | 'rules'>(
    announcement?.type || 'text'
  );
  const [content, setContent] = useState(announcement?.content || '');
  const [pinned, setPinned] = useState(announcement?.pinned || false);
  const [expiryDate, setExpiryDate] = useState<string>(
    announcement?.expiresAt || ''
  );
  const [eventDetails, setEventDetails] = useState({
    date: announcement?.metadata?.eventDate || '',
    location: announcement?.metadata?.location || '',
  });
  const [pollDetails, setPollDetails] = useState({
    options: announcement?.metadata?.options?.map(o => o.text) || ['', ''],
    allowMultipleVotes: announcement?.metadata?.allowMultipleVotes || false,
    endDate: announcement?.metadata?.endDate || '',
  });

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Content is required');
      return;
    }

    if (type === 'poll' && pollDetails.options.some(opt => !opt.trim())) {
      Alert.alert('Error', 'All poll options must be filled');
      return;
    }

    if (type === 'event' && !eventDetails.date) {
      Alert.alert('Error', 'Event date is required');
      return;
    }

    setIsLoading(true);
    try {
      const metadata: any = {};
      
      if (type === 'event') {
        metadata.eventDate = eventDetails.date;
        if (eventDetails.location) {
          metadata.location = eventDetails.location;
        }
      } else if (type === 'poll') {
        metadata.options = pollDetails.options.map(text => ({ text, votes: [] }));
        metadata.allowMultipleVotes = pollDetails.allowMultipleVotes;
        if (pollDetails.endDate) {
          metadata.endDate = pollDetails.endDate;
        }
      }

      const announcementData = {
        content: content.trim(),
        type,
        pinned,
        expiresAt: expiryDate || undefined,
        metadata,
      };

      let response;
      if (announcement) {
        response = await announcementsAPI.updateAnnouncement(announcement._id, announcementData);
      } else {
        response = await announcementsAPI.createAnnouncement(chatId, announcementData);
      }

      if (response.success) {
        if (announcement) {
          onEdited?.(response.announcement);
        } else {
          onCreated(response.announcement);
        }
        Alert.alert('Success', `Announcement ${announcement ? 'updated' : 'created'} successfully`);
        onClose();
      }
    } catch (error) {
      console.error('Error creating announcement:', error);
      Alert.alert('Error', `Could not ${announcement ? 'update' : 'create'} announcement`);
    } finally {
      setIsLoading(false);
    }
  };

  const addPollOption = () => {
    if (pollDetails.options.length < 10) {
      setPollDetails(prev => ({
        ...prev,
        options: [...prev.options, ''],
      }));
    }
  };

  const removePollOption = (index: number) => {
    if (pollDetails.options.length > 2) {
      setPollDetails(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index),
      }));
    }
  };

  const updatePollOption = (index: number, value: string) => {
    setPollDetails(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt),
    }));
  };

  const renderTypeSelector = () => (
    <View style={styles.section}>
      <Text style={styles.label}>Type</Text>
      <View style={styles.typeSelector}>
        {(['text', 'event', 'poll', 'rules'] as const).map((typeOption) => (
          <TouchableOpacity
            key={typeOption}
            style={[
              styles.typeOption,
              type === typeOption && styles.typeOptionSelected,
            ]}
            onPress={() => setType(typeOption)}
          >
            <Text style={[
              styles.typeOptionText,
              type === typeOption && styles.typeOptionTextSelected,
            ]}>
              {typeOption.charAt(0).toUpperCase() + typeOption.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderEventDetails = () => (
    <View style={styles.section}>
      <Text style={styles.label}>Event Details</Text>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Event Date</Text>
        <TextInput
          style={styles.input}
          value={eventDetails.date}
          onChangeText={(text) => setEventDetails(prev => ({ ...prev, date: text }))}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#999"
        />
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Location (optional)</Text>
        <TextInput
          style={styles.input}
          value={eventDetails.location}
          onChangeText={(text) => setEventDetails(prev => ({ ...prev, location: text }))}
          placeholder="Event location"
          placeholderTextColor="#999"
        />
      </View>
    </View>
  );

  const renderPollDetails = () => (
    <View style={styles.section}>
      <Text style={styles.label}>Poll Options</Text>
      {pollDetails.options.map((option, index) => (
        <View key={index} style={styles.pollOptionContainer}>
          <TextInput
            style={styles.input}
            value={option}
            onChangeText={(text) => updatePollOption(index, text)}
            placeholder={`Option ${index + 1}`}
            placeholderTextColor="#999"
          />
          {pollDetails.options.length > 2 && (
            <TouchableOpacity
              style={styles.removeOptionButton}
              onPress={() => removePollOption(index)}
            >
              <Ionicons name="close" size={20} color="#FF3B30" />
            </TouchableOpacity>
          )}
        </View>
      ))}
      {pollDetails.options.length < 10 && (
        <TouchableOpacity style={styles.addOptionButton} onPress={addPollOption}>
          <Ionicons name="add" size={20} color="#007AFF" />
          <Text style={styles.addOptionText}>Add Option</Text>
        </TouchableOpacity>
      )}
      
      <View style={styles.switchContainer}>
        <TouchableOpacity
          style={styles.switchRow}
          onPress={() => setPollDetails(prev => ({ ...prev, allowMultipleVotes: !prev.allowMultipleVotes }))}
        >
          <Text style={styles.switchLabel}>Allow multiple votes</Text>
          <View style={[styles.switch, pollDetails.allowMultipleVotes && styles.switchActive]}>
            <View style={[styles.switchThumb, pollDetails.allowMultipleVotes && styles.switchThumbActive]} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Poll End Date (optional)</Text>
        <TextInput
          style={styles.input}
          value={pollDetails.endDate}
          onChangeText={(text) => setPollDetails(prev => ({ ...prev, endDate: text }))}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#999"
        />
      </View>
    </View>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {announcement ? 'Edit' : 'Create'} Announcement
          </Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.submitText}>
                {announcement ? 'Update' : 'Create'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderTypeSelector()}

          <View style={styles.section}>
            <Text style={styles.label}>Content</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={content}
              onChangeText={setContent}
              placeholder="Write your announcement..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {type === 'event' && renderEventDetails()}
          {type === 'poll' && renderPollDetails()}

          <View style={styles.switchContainer}>
            <TouchableOpacity
              style={styles.switchRow}
              onPress={() => setPinned(!pinned)}
            >
              <Text style={styles.switchLabel}>Pin announcement</Text>
              <View style={[styles.switch, pinned && styles.switchActive]}>
                <View style={[styles.switchThumb, pinned && styles.switchThumbActive]} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Expiry Date (optional)</Text>
            <TextInput
              style={styles.input}
              value={expiryDate}
              onChangeText={setExpiryDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
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
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  submitButton: {
    padding: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  typeOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeOptionText: {
    fontSize: 14,
    color: '#666',
  },
  typeOptionTextSelected: {
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pollOptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  removeOptionButton: {
    padding: 8,
    marginLeft: 8,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addOptionText: {
    marginLeft: 8,
    color: '#007AFF',
    fontSize: 14,
  },
  switchContainer: {
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 16,
    color: '#000',
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: '#007AFF',
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },
});
