import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthContextType, RegisterData } from '../types';
import { authAPI } from '../api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        // Verify token with the backend
        const user = await authAPI.getCurrentUser();
        await AsyncStorage.setItem('user', JSON.stringify(user));
        setUser(user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Token validation failed, logging out:', error);
      await logout(); // Token is invalid or expired, so log out
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const data = await authAPI.login(email, password);
      // Backend returns 'accessToken', not 'token'
      const token = data.accessToken || data.token;
      if (!token) {
        throw new Error('No authentication token received');
      }
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('userId', data.user.id);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      const data = await authAPI.register(userData);
      // Backend returns 'accessToken', not 'token'
      const token = data.accessToken || data.token;
      if (!token) {
        throw new Error('No authentication token received');
      }
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('userId', data.user.id);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
