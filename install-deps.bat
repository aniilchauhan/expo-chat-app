@echo off
echo Installing Expo Chat App dependencies...
echo.

echo Installing main dependencies...
npm install @expo/vector-icons@^13.0.0 @react-navigation/native@^6.1.9 @react-navigation/stack@^6.3.20 @react-navigation/bottom-tabs@^6.5.11 expo@~49.0.15 expo-status-bar@~1.6.0 react@18.2.0 react-native@0.72.6 react-native-safe-area-context@4.6.3 react-native-screens@~3.22.0 react-native-gesture-handler@~2.12.0 react-native-reanimated@~3.3.0 react-native-vector-icons@^10.0.0 axios@^1.6.0 socket.io-client@^4.7.4 @react-native-async-storage/async-storage@1.18.2 react-native-elements@^3.4.3 react-native-paper@^5.11.0 date-fns@^2.30.0 expo-image-picker@~14.3.2 expo-notifications@~0.20.1 expo-constants@~14.4.2

echo.
echo Installing dev dependencies...
npm install --save-dev @babel/core@^7.20.0 @types/react@~18.2.14 @types/react-native@~0.72.2 typescript@^5.1.3

echo.
echo Dependencies installed successfully!
echo You can now run: npm start
pause
