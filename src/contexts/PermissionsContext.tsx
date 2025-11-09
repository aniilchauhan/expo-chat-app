import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState } from 'react-native';
import { PermissionState, PermissionStatus } from '../types/permissions';
import permissionsService from '../services/permissionsService';

interface PermissionsContextValue {
  permissions: PermissionState;
  checkPermissions: () => Promise<PermissionState>;
  requestPermissions: () => Promise<PermissionState>;
  checkAndRequestPermissions: (type: 'audio' | 'video') => Promise<boolean>;
  requestCameraPermission: () => Promise<boolean>;
  requestMicrophonePermission: () => Promise<boolean>;
  requestStoragePermission: () => Promise<boolean>;
}

const PermissionsContext = createContext<PermissionsContextValue | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [permissions, setPermissions] = useState<PermissionState>({
    camera: 'undetermined',
    microphone: 'undetermined',
    storage: 'undetermined',
  });

  useEffect(() => {
    checkPermissions();
    
    // Set up permission change listeners
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkPermissions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const checkPermissions = async () => {
    const newPermissions = await permissionsService.checkPermissions();
    setPermissions(newPermissions);
    return newPermissions;
  };

  const requestPermissions = async () => {
    const newPermissions = await permissionsService.requestPermissions();
    setPermissions(newPermissions);
    return newPermissions;
  };

  const checkAndRequestPermissions = async (type: 'audio' | 'video') => {
    const result = await permissionsService.checkAndRequestPermissions(type);
    await checkPermissions(); // Update context state
    return result;
  };

  const requestCameraPermission = async () => {
    const result = await permissionsService.requestCameraPermission();
    await checkPermissions();
    return result === 'granted';
  };

  const requestMicrophonePermission = async () => {
    const result = await permissionsService.requestMicrophonePermission();
    await checkPermissions();
    return result === 'granted';
  };

  const requestStoragePermission = async () => {
    const result = await permissionsService.requestStoragePermission();
    await checkPermissions();
    return result === 'granted';
  };

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        checkPermissions,
        requestPermissions,
        checkAndRequestPermissions,
        requestCameraPermission,
        requestMicrophonePermission,
        requestStoragePermission,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};
