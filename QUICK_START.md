# Expo Chat App - Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Expo Go app installed on your mobile device (for development)
- iOS Simulator (Mac only) or Android Emulator (optional)

## Installation

1. **Navigate to the project directory**:
```bash
cd expo-chat-app
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure environment variables**:
Create a `.env` file in the root directory:
```
EXPO_PUBLIC_API_URL=http://localhost:3001
```

For production, use your deployed backend URL:
```
EXPO_PUBLIC_API_URL=https://your-backend-url.com
```

## Running the App

### Development Mode

Start the Expo development server:
```bash
npm start
```

This will open the Expo Developer Tools in your browser.

### Run on Physical Device

1. Install **Expo Go** app from:
   - iOS: App Store
   - Android: Google Play Store

2. Scan the QR code shown in the terminal or browser with:
   - iOS: Camera app
   - Android: Expo Go app

### Run on iOS Simulator (Mac only)

```bash
npm run ios
```

### Run on Android Emulator

```bash
npm run android
```

## Features Overview

### Authentication
- Register new account with email, username, and password
- Login with email, phone, or userId
- Forgot password and reset functionality
- Secure token-based authentication

### Chat Features
- Real-time messaging with Socket.IO
- Text, image, video, audio messages
- Location and contact sharing
- Message reactions with emojis
- Threaded replies
- Message editing and deletion
- Typing indicators
- Read receipts
- Online presence

### Group Chats
- Create and manage groups
- Add/remove members
- Role-based permissions (owner, admin, moderator, member)
- Group invites with codes
- Announcements and polls
- Pin messages

### Media Handling
- Camera integration for photos/videos
- File picker for documents
- Voice message recording
- Media gallery view
- Image/video preview

### Push Notifications
- Real-time push notifications
- Notification preferences
- Deep linking to chats
- Test notification feature

### Profile & Settings
- Edit profile information
- Avatar upload
- Status message
- Privacy settings
- Theme selection (Light/Dark/System)
- Blocked users management
- Cache management

## Project Structure

```
expo-chat-app/
├── src/
│   ├── api/                    # API client modules
│   │   ├── index.ts           # Main API exports
│   │   ├── auth.ts            # Authentication API
│   │   └── reactions.ts       # Reactions API
│   ├── components/            # Reusable components
│   │   ├── chat/             # Chat-specific components
│   │   └── permissions/      # Permission components
│   ├── contexts/             # React contexts
│   │   ├── AuthContext.tsx   # Authentication state
│   │   ├── ThemeContext.tsx  # Theme management
│   │   └── PermissionsContext.tsx
│   ├── hooks/                # Custom hooks
│   ├── navigation/           # Navigation configuration
│   │   └── AppNavigator.tsx  # Main navigator
│   ├── screens/              # Screen components
│   │   ├── AuthScreen.tsx    # Login/Register
│   │   ├── HomeScreen.tsx    # Chat list
│   │   ├── ChatScreen.tsx    # Individual chat
│   │   ├── ProfileScreen.tsx # User profile
│   │   └── SettingsScreen.tsx # App settings
│   ├── services/             # Service modules
│   │   ├── notifications.ts  # Push notifications
│   │   ├── OfflineStorage.ts # Local caching
│   │   └── permissionsService.ts
│   ├── theme/                # Theme configuration
│   ├── types/                # TypeScript types
│   └── utils/                # Utility functions
├── App.tsx                   # Root component
├── app.json                  # Expo configuration
├── package.json              # Dependencies
└── tsconfig.json            # TypeScript config
```

## Common Commands

### Development
```bash
npm start          # Start Expo dev server
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
npm run web        # Run in web browser
```

### Troubleshooting
```bash
# Clear cache and restart
npm start -- --clear

# Reset Metro bundler cache
npx expo start -c

# Reinstall dependencies
rm -rf node_modules
npm install
```

## Testing the App

### Test User Accounts
Create test accounts through the registration screen or use existing accounts from your backend.

### Test Features
1. **Registration**: Create a new account
2. **Login**: Sign in with credentials
3. **Chat List**: View your chats
4. **New Chat**: Search for users and start a chat
5. **Send Messages**: Try text, images, voice messages
6. **Reactions**: Long-press a message and add reactions
7. **Groups**: Create a group chat
8. **Notifications**: Send a message from another device
9. **Profile**: Update your profile information
10. **Settings**: Change theme, privacy settings

## Backend Connection

Ensure your backend server is running and accessible:

1. **Local Development**:
   - Backend should be running on `http://localhost:3001`
   - Use your computer's IP address for physical devices: `http://192.168.x.x:3001`

2. **Production**:
   - Update `EXPO_PUBLIC_API_URL` to your deployed backend URL
   - Ensure HTTPS is enabled for production

## Permissions

The app requires the following permissions:

### iOS
- Camera (for photo/video capture)
- Microphone (for voice messages)
- Photo Library (for image selection)
- Notifications (for push notifications)
- Location (for location sharing)
- Contacts (for contact sharing)

### Android
- CAMERA
- RECORD_AUDIO
- READ_EXTERNAL_STORAGE
- WRITE_EXTERNAL_STORAGE
- POST_NOTIFICATIONS
- ACCESS_FINE_LOCATION
- READ_CONTACTS

Permissions are requested at runtime when needed.

## Building for Production

### Using EAS Build

1. **Install EAS CLI**:
```bash
npm install -g eas-cli
```

2. **Login to Expo**:
```bash
eas login
```

3. **Configure EAS**:
```bash
eas build:configure
```

4. **Build for iOS**:
```bash
eas build --platform ios
```

5. **Build for Android**:
```bash
eas build --platform android
```

6. **Submit to App Stores**:
```bash
eas submit --platform ios
eas submit --platform android
```

## Environment Variables

Create a `.env` file with:

```env
# Backend API URL
EXPO_PUBLIC_API_URL=http://localhost:3001

# Optional: Analytics, etc.
# EXPO_PUBLIC_ANALYTICS_KEY=your-key
```

## Troubleshooting

### Common Issues

1. **"Unable to connect to server"**
   - Check if backend is running
   - Verify API_URL is correct
   - For physical devices, use computer's IP address

2. **"Expo Go app not connecting"**
   - Ensure device and computer are on same network
   - Try restarting Expo dev server
   - Clear Expo cache: `npm start -- --clear`

3. **"Push notifications not working"**
   - Check notification permissions
   - Verify Expo push token is registered
   - Test notifications from settings screen

4. **"Images not uploading"**
   - Check camera/photo library permissions
   - Verify backend upload endpoint is working
   - Check file size limits (50MB max)

5. **"App crashes on startup"**
   - Clear cache and reinstall
   - Check for TypeScript errors
   - Verify all dependencies are installed

### Getting Help

- Check the implementation summary: `TASK_10_IMPLEMENTATION_SUMMARY.md`
- Review backend documentation
- Check Expo documentation: https://docs.expo.dev
- React Native documentation: https://reactnative.dev

## Next Steps

1. **Customize**: Modify colors, branding, and features
2. **Test**: Thoroughly test on real devices
3. **Optimize**: Profile performance and optimize
4. **Deploy**: Build and submit to app stores
5. **Monitor**: Set up analytics and crash reporting

## Support

For issues or questions:
1. Check the implementation summary
2. Review the backend API documentation
3. Check Expo and React Native docs
4. Review the codebase comments

Happy coding! 🚀
