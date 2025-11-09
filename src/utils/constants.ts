// App Constants
export const APP_NAME = 'ChatApp';
export const VERSION = '1.0.0';

// API Configuration
export const API_CONFIG = {
  BASE_URL: 'https://chat-app-backend-zy93.onrender.com',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'userData',
  THEME: 'theme',
  LANGUAGE: 'language',
};

// Message Types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
} as const;

// Chat Types
export const CHAT_TYPES = {
  PRIVATE: 'private',
  GROUP: 'group',
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

// Socket Events
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  JOIN_CHAT: 'join_chat',
  LEAVE_CHAT: 'leave_chat',
  SEND_MESSAGE: 'send_message',
  RECEIVE_MESSAGE: 'receive_message',
  USER_TYPING: 'user_typing',
  USER_STOP_TYPING: 'user_stop_typing',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  MESSAGE_READ: 'message_read',
} as const;

// UI Constants
export const UI_CONSTANTS = {
  HEADER_HEIGHT: 60,
  TAB_BAR_HEIGHT: 80,
  MESSAGE_MAX_LENGTH: 1000,
  CHAT_NAME_MAX_LENGTH: 50,
  AVATAR_SIZE: {
    SMALL: 30,
    MEDIUM: 40,
    LARGE: 80,
  },
} as const;

// Colors (can be overridden by theme)
export const COLORS = {
  PRIMARY: '#2196f3',
  SECONDARY: '#03dac6',
  BACKGROUND: '#f5f5f5',
  SURFACE: '#ffffff',
  ERROR: '#b00020',
  SUCCESS: '#4caf50',
  WARNING: '#ff9800',
  TEXT_PRIMARY: '#000000',
  TEXT_SECONDARY: '#666666',
} as const;

// Validation Rules
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 6,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;