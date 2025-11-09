import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, PermissionsAndroid, Platform } from 'react-native';
import { Appbar, Avatar, Searchbar, List, Divider, Button } from 'react-native-paper';
import * as Contacts from 'expo-contacts';
import { usersAPI, chatsAPI } from '../api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

interface Contact {
  id: string;
  name: string;
  phoneNumbers?: string[];
  emails?: string[];
  isAppUser?: boolean;
  userId?: string;
}

const ContactsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [suggestedContacts, setSuggestedContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    checkPermissions();
    loadSuggestedContacts();
  }, []);

  const checkPermissions = async () => {
    try {
      // Check if we're in Expo Go
      const isExpoGo = __DEV__ && !Platform.select({ web: false, default: true });
      
      if (isExpoGo) {
        console.log('⚠️ Contact sync not available in Expo Go. Use User Search instead.');
        setHasPermission(false);
        return;
      }

      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Permission',
            message: 'This app needs access to your contacts to show suggested friends.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setHasPermission(true);
          loadContacts();
        } else {
          setHasPermission(false);
          console.log('Contacts permission denied');
        }
      } else {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status === 'granted') {
          setHasPermission(true);
          loadContacts();
        } else {
          setHasPermission(false);
          console.log('Contacts permission denied');
        }
      }
    } catch (error: any) {
      console.error('Error requesting contacts permission:', error);
      setHasPermission(false);
      
      // Show helpful message for Expo Go users
      if (error.message?.includes('not available') || error.message?.includes('Expo Go')) {
        Alert.alert(
          'Contact Sync Unavailable',
          'Contact sync is not available in Expo Go. Please use the User Search feature to find friends.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const loadContacts = async () => {
    if (!hasPermission) {
      console.log('Skipping contacts load - no permission');
      return;
    }
    
    try {
      setIsLoading(true);
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
        ],
      });

      if (data.length > 0) {
        const formattedContacts = data
          .filter(contact => contact.id && contact.name && (contact.phoneNumbers?.length || contact.emails?.length))
          .map(contact => ({
            id: contact.id!,
            name: contact.name || 'Unknown',
            phoneNumbers: contact.phoneNumbers?.map(p => p.number).filter((n): n is string => !!n) || [],
            emails: contact.emails?.map(e => e.email).filter((e): e is string => !!e) || [],
            isAppUser: false,
          }));

        setContacts(formattedContacts);
        await checkAppUsers(formattedContacts);
      }
    } catch (error: any) {
      console.error('Error loading contacts:', error);
      // Only show alert if it's not a permission error
      if (!error.message?.includes('permission')) {
        Alert.alert('Error', 'Failed to load contacts');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const checkAppUsers = async (deviceContacts: Contact[]) => {
    try {
      // Check which contacts are app users by searching for their phone numbers/emails
      const appUsers: Contact[] = [];
      
      for (const contact of deviceContacts) {
        // Search by phone number
        if (contact.phoneNumbers) {
          for (const phone of contact.phoneNumbers) {
            try {
              const users = await usersAPI.searchUsers(phone);
              if (users && users.length > 0) {
                appUsers.push({
                  ...contact,
                  isAppUser: true,
                  userId: users[0]._id || users[0].id,
                });
                break;
              }
            } catch (error) {
              // Continue to next contact
            }
          }
        }

        // Search by email if no phone match found
        if (!contact.isAppUser && contact.emails) {
          for (const email of contact.emails) {
            try {
              const users = await usersAPI.searchUsers(email);
              if (users && users.length > 0) {
                appUsers.push({
                  ...contact,
                  isAppUser: true,
                  userId: users[0]._id || users[0].id,
                });
                break;
              }
            } catch (error) {
              // Continue to next contact
            }
          }
        }
      }

      setSuggestedContacts(appUsers);
    } catch (error) {
      console.error('Error checking app users:', error);
    }
  };

  const loadSuggestedContacts = async () => {
    try {
      // Load suggested contacts from backend (users you might know)
      // This could be based on mutual friends, location, etc.
      // For now, we'll use a placeholder
      setSuggestedContacts([]);
    } catch (error) {
      console.error('Error loading suggested contacts:', error);
    }
  };

  const startChat = async (contact: Contact) => {
    if (!contact.isAppUser || !contact.userId) {
      Alert.alert('Not Available', 'This contact is not using the app yet');
      return;
    }

    try {
      const result = await chatsAPI.findOrCreateChat(contact.userId);
      const chat = result.chat || result;
      
      if (chat && chat._id) {
        (navigation as any).navigate('Chat', { chatId: chat._id });
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Error', 'Failed to start chat');
    }
  };

  const inviteContact = (contact: Contact) => {
    const message = `Hi ${contact.name}! I'm using ChatApp. Join me at: https://yourapp.com/download`;
    Alert.alert(
      'Invite Contact',
      message,
      [
        { text: 'Copy Message', onPress: () => console.log('Copy to clipboard') },
        { text: 'Share', onPress: () => console.log('Share via native sharing') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const renderContactItem = ({ item }: { item: Contact }) => (
    <List.Item
      title={item.name}
      description={item.phoneNumbers?.[0] || item.emails?.[0] || 'No contact info'}
      titleStyle={{ color: colors.text }}
      descriptionStyle={{ color: colors.textSecondary }}
      left={(props) => (
        <Avatar.Text 
          {...props} 
          size={40} 
          label={item.name.charAt(0).toUpperCase()} 
          style={{ backgroundColor: colors.primary }}
        />
      )}
      right={(props) => (
        <View style={styles.contactActions}>
          {item.isAppUser ? (
            <Button 
              mode="contained" 
              onPress={() => startChat(item)}
              style={styles.chatButton}
              buttonColor={colors.primary}
              textColor="#fff"
            >
              Chat
            </Button>
          ) : (
            <Button 
              mode="outlined" 
              onPress={() => inviteContact(item)}
              style={styles.inviteButton}
              textColor={colors.primary}
            >
              Invite
            </Button>
          )}
        </View>
      )}
    />
  );

  const renderSuggestedContact = ({ item }: { item: Contact }) => (
    <List.Item
      title={item.name}
      description="Suggested contact"
      titleStyle={{ color: colors.text }}
      descriptionStyle={{ color: colors.textSecondary }}
      left={(props) => (
        <Avatar.Text 
          {...props} 
          size={40} 
          label={item.name.charAt(0).toUpperCase()} 
          style={[styles.suggestedAvatar, { backgroundColor: colors.success }]}
        />
      )}
      right={(props) => (
        <Button 
          mode="contained" 
          onPress={() => startChat(item)}
          style={styles.chatButton}
          buttonColor={colors.primary}
          textColor="#fff"
        >
          Start Chat
        </Button>
      )}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header style={{ backgroundColor: colors.surface }}>
        <Appbar.Content title="Contacts" titleStyle={{ color: colors.text }} />
        <Appbar.Action icon="account-plus" onPress={() => (navigation as any).navigate('UserSearch')} color={colors.text} />
      </Appbar.Header>

      <Searchbar
        placeholder="Search contacts"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={[styles.searchbar, { backgroundColor: colors.surface }]}
        iconColor={colors.textSecondary}
        placeholderTextColor={colors.textSecondary}
        inputStyle={{ color: colors.text }}
      />

      {!hasPermission ? (
        <View style={styles.permissionContainer}>
          <Text style={[styles.permissionTitle, { color: colors.text }]}>Find Friends</Text>
          <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
            Contact sync is not available in Expo Go.{'\n'}
            Use User Search to find friends instead!
          </Text>
          <Button 
            mode="contained" 
            onPress={() => (navigation as any).navigate('UserSearch')}
            style={styles.searchButton}
            icon="magnify"
            buttonColor={colors.primary}
            textColor="#fff"
          >
            Search Users
          </Button>
          <Button 
            mode="outlined" 
            onPress={checkPermissions}
            style={styles.tryAgainButton}
            textColor={colors.primary}
          >
            Try Contact Sync Anyway
          </Button>
        </View>
      ) : (
        <>
          {suggestedContacts.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Suggested Contacts</Text>
              <FlatList
                data={suggestedContacts}
                renderItem={renderSuggestedContact}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </View>
          )}

          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Device Contacts</Text>
              <Text style={[styles.contactCount, { color: colors.textSecondary }]}>{contacts.length} contacts</Text>
            </View>
            <FlatList
              data={contacts}
              renderItem={renderContactItem}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <Divider style={{ backgroundColor: colors.border }} />}
            />
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchbar: { margin: 10 },
  permissionContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12
  },
  permissionText: { 
    textAlign: 'center', 
    marginBottom: 24, 
    fontSize: 16,
    lineHeight: 24
  },
  searchButton: {
    marginBottom: 12,
    paddingHorizontal: 24
  },
  tryAgainButton: {
    paddingHorizontal: 24
  },
  section: { marginBottom: 10 },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 8 
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '600'
  },
  contactCount: { 
    fontSize: 12
  },
  contactActions: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  chatButton: { 
    marginLeft: 8 
  },
  inviteButton: { 
    marginLeft: 8 
  },
  suggestedAvatar: {},
});

export default ContactsScreen;
