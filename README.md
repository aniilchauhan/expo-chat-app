# Expo Chat App

A cross-platform messaging app built with Expo and React Native, with end-to-end encrypted chats, voice and video calls, groups and voice messages.

## Features

- **End-to-end encryption** with per-device identity keys, secure key storage (Keychain) and security-code verification
- **Voice and video calls** over WebRTC, with incoming-call screen, call controls, multi-party call grid and call history
- **Real-time messaging** via Socket.IO: typing indicators, reactions, threads, message search and swipe-to-reply
- **Voice messages** with recorder, waveform visualizer and player
- **Groups**: create groups, manage members and invites, group settings and announcements
- **Media**: camera, image and document picker, file upload, chat media gallery
- **Offline storage** (SQLite / AsyncStorage) and data export
- **Biometric unlock**, push notifications and multi-device management
- **Localization** (i18n) and light/dark theme

## Tech stack

| Area | Tools |
| --- | --- |
| App | Expo SDK 54, React Native 0.81 (New Architecture), TypeScript |
| Navigation | Expo Router, React Navigation (stack + bottom tabs) |
| Realtime | Socket.IO client, react-native-webrtc |
| Security | expo-crypto, react-native-keychain, react-native-securerandom |
| UI | React Native Paper, Reanimated, Lottie, vector icons |
| Storage | expo-sqlite, AsyncStorage |

## Project structure

```
src/
  screens/      Chat, Home, Contacts, Call, CallHistory, Group*, Settings, Devices, SecurityCode ...
  components/   chat/, call/, permissions/, voice recorder and player
  services/     encryption/, KeyStorage, webrtc, notifications, OfflineStorage, biometrics
  contexts/     Auth, Call, Permissions, Theme
  hooks/        useSocket, useCallPermissions, useTranslation
  navigation/   AppNavigator
```

## Run locally

**Prerequisites:** Node.js 20+, Android Studio or Xcode (WebRTC needs a dev build, not Expo Go)

```bash
npm install
# set EXPO_PUBLIC_API_URL in .env to your chat backend
npx expo run:android   # or: npx expo run:ios
```

Builds for testers are made with EAS (`eas.json`).

## License

[MIT](LICENSE) © Anil Chauhan
