import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { registerForPushNotificationsAsync } from '../utils/notifications';

export const setupNotifications = async () => {
  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return null;
  }

  // Get the token
  const token = await registerForPushNotificationsAsync();
  
  // Configure notification behavior
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  return token;
};

export const schedulePushNotification = async (title: string, body: string, data = {}) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
    },
    trigger: null, // Send immediately
  });
};

// Listen to notification events
export const addNotificationReceivedListener = (listener: (notification: any) => void) => {
  return Notifications.addNotificationReceivedListener(listener);
};

export const addNotificationResponseReceivedListener = (listener: (response: any) => void) => {
  return Notifications.addNotificationResponseReceivedListener(listener);
};
