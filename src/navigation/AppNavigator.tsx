import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import AuthScreen from '../screens/AuthScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import UserSearchScreen from '../screens/UserSearchScreen';
import ChatMediaGalleryScreen from '../screens/ChatMediaGalleryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CallScreen from '../screens/CallScreen';
import CallHistoryScreen from '../screens/CallHistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import GroupCreateScreen from '../screens/GroupCreateScreen';
import GroupSettingsScreen from '../screens/GroupSettingsScreen';
import ContactsScreen from '../screens/ContactsScreen';

export const navigationRef: any = React.createRef();

export type RootStackParamList = {
  Auth: undefined;
  Login: undefined;
  Main: undefined;
  Chat: { chatId?: string };
  Forgot: undefined;
  Reset: undefined;
  UserSearch: undefined;
  ChatMediaGallery: { chatId: string };
  Call: { receiverId?: string; type?: 'voice' | 'video'; chatId?: string };
  GroupCreate: undefined;
  GroupSettings: { chatId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Chats: undefined;
  Contacts: undefined;
  Profile: undefined;
  Settings: undefined;
  Calls: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator = () => {
  const { colors } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'Home') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Contacts') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else if (route.name === 'Calls') {
            iconName = focused ? 'call' : 'call-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Chats' }}
      />
      <Tab.Screen 
        name="Contacts" 
        component={ContactsScreen}
        options={{ title: 'Contacts' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Tab.Screen 
        name="Calls" 
        component={CallHistoryScreen}
        options={{ title: 'Calls' }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a loading screen component
  }

  return (
    <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0],
                    }),
                  },
                ],
              },
            };
          },
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen}
              options={{ 
                headerShown: true,
                title: 'Chat',
                headerBackTitleVisible: false,
                animationEnabled: true,
              }}
            />
            <Stack.Screen 
              name="UserSearch" 
              component={UserSearchScreen}
              options={{ 
                headerShown: true,
                title: 'Search Users',
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen name="ChatMediaGallery" component={ChatMediaGalleryScreen} />
            <Stack.Screen name="GroupCreate" component={GroupCreateScreen} />
            <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} />
            <Stack.Screen name="Call" component={CallScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Forgot" component={ForgotPasswordScreen} />
            <Stack.Screen name="Reset" component={ResetPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
  );
};

export default AppNavigator;