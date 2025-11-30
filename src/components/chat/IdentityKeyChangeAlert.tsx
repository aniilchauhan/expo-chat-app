import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface IdentityKeyChangeAlertProps {
  contactName: string;
  changedAt: Date;
  onVerify: () => void;
  onDismiss: () => void;
}

/**
 * IdentityKeyChangeAlert - Display notification when contact's identity key changes
 * 
 * Shows a prominent warning in the chat when a contact's identity key has changed,
 * which could indicate a security issue or simply a device reinstall.
 */
export const IdentityKeyChangeAlert: React.FC<IdentityKeyChangeAlertProps> = ({
  contactName,
  changedAt,
  onVerify,
  onDismiss,
}) => {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="warning" size={24} color="#FF9500" />
        <Text style={styles.title}>Security Code Changed</Text>
      </View>

      <Text style={styles.message}>
        {contactName}'s security code has changed {formatDate(changedAt)}. This could be
        because they reinstalled the app or changed devices.
      </Text>

      <Text style={styles.warning}>
        For your security, verify the new security code with {contactName} before
        continuing the conversation.
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.verifyButton]}
          onPress={onVerify}
        >
          <Ionicons name="shield-checkmark" size={18} color="white" />
          <Text style={styles.verifyButtonText}>Verify Security Code</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.dismissButton]}
          onPress={onDismiss}
        >
          <Text style={styles.dismissButtonText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF3CD',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
  },
  message: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
    marginBottom: 8,
  },
  warning: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: '500',
  },
  actions: {
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  verifyButton: {
    backgroundColor: '#FF9500',
  },
  verifyButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  dismissButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#856404',
  },
  dismissButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#856404',
  },
});
