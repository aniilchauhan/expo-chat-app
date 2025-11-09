import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { PermissionsProvider } from './src/contexts/PermissionsContext';
import AppNavigator, { navigationRef } from './src/navigation/AppNavigator';
import { setupNotifications, addNotificationResponseReceivedListener } from './src/services/notifications';
import { handleNotificationResponse } from './src/utils/notifications';
import { usersAPI } from './src/api';
import { initI18n } from './src/i18n';

function AppContent() {
  const { user } = useAuth();
  const responseListener = useRef<any>(null);

  useEffect(() => {
    (async () => {
      if (user?._id) {
        const token = await setupNotifications();
        if (token) {
          try {
            await usersAPI.savePushToken(token, user._id);
            console.log('✅ Push token registered successfully');
          } catch (e) {
            console.log('❌ Failed to save push token', e);
          }
        }
      }
    })();

    return () => {
      if (responseListener.current) responseListener.current.remove();
    };
  }, [user]);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        responseListener.current = addNotificationResponseReceivedListener((response: any) => {
          const data = response.notification.request.content.data as any;
          if (data?.chatId) {
            navigationRef.current?.navigate('Chat', { chatId: data.chatId });
          }
        });
      }}
    >
      <AppNavigator />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

export default function App() {
  const [i18nInitialized, setI18nInitialized] = useState(false);

  useEffect(() => {
    initI18n().then(() => {
      setI18nInitialized(true);
    });
  }, []);

  if (!i18nInitialized) {
    return null; // Or a loading screen
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider>
          <ThemeProvider>
            <PermissionsProvider>
              <AuthProvider>
                <AppContent />
              </AuthProvider>
            </PermissionsProvider>
          </ThemeProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}