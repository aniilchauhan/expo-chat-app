import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Avatar,
  Button,
  TextInput,
  Card,
  Title,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface UserProfileProps {
  user: User;
  onClose: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({
  user,
  onClose,
}) => {
  const { logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);

  const handleSave = async () => {
    try {
      // TODO: Implement profile update API call
      Alert.alert('Success', 'Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEmail(user.email);
    setIsEditing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            logout();
            onClose();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Avatar.Text
            size={80}
            label={`${user.firstName[0]}${user.lastName[0]}`}
          />
          <Title style={styles.name}>
            {user.firstName} {user.lastName}
          </Title>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Profile Information</Title>
            <Divider style={styles.divider} />
            
            <TextInput
              label="First Name"
              value={firstName}
              onChangeText={setFirstName}
              disabled={!isEditing}
              style={styles.input}
            />
            
            <TextInput
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              disabled={!isEditing}
              style={styles.input}
            />
            
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              disabled={!isEditing}
              keyboardType="email-address"
              style={styles.input}
            />
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          {isEditing ? (
            <View style={styles.editButtons}>
              <Button
                mode="contained"
                onPress={handleSave}
                style={[styles.button, styles.saveButton]}
              >
                Save
              </Button>
              <Button
                mode="outlined"
                onPress={handleCancel}
                style={styles.button}
              >
                Cancel
              </Button>
            </View>
          ) : (
            <Button
              mode="contained"
              onPress={() => setIsEditing(true)}
              style={styles.button}
            >
              Edit Profile
            </Button>
          )}
          
          <Button
            mode="outlined"
            onPress={onClose}
            style={styles.button}
          >
            Close
          </Button>
          
          <Button
            mode="outlined"
            onPress={handleLogout}
            style={[styles.button, styles.logoutButton]}
            textColor="#d32f2f"
          >
            Logout
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  name: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 24,
  },
  divider: {
    marginVertical: 16,
  },
  input: {
    marginBottom: 12,
  },
  buttonContainer: {
    gap: 12,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#4caf50',
  },
  logoutButton: {
    borderColor: '#d32f2f',
  },
});

export default UserProfile;