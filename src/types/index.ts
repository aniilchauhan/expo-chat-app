export interface User {
  _id?: string;
  id?: string;
  email: string;
  username?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: string;
  status?: string;
  statusMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Chat {
  _id: string;
  type: 'private' | 'group';
  name?: string;
  description?: string;
  avatar?: string;
  participants: ChatParticipant[];
  settings: ChatSettings;
  pinnedMessages: string[];
  bannedUsers: BannedUser[];
  invites: ChatInvite[];
  lastMessage?: Message;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatParticipant {
  userId: User;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  joinedAt: string;
  leftAt?: string;
  permissions: ParticipantPermissions;
  isOnline?: boolean;
}

export interface ParticipantPermissions {
  canInvite: boolean;
  canKick: boolean;
  canBan: boolean;
  canPinMessages: boolean;
  canDeleteMessages: boolean;
  canEditInfo: boolean;
}

export interface ChatSettings {
  isPublic: boolean;
  joinRequiresApproval: boolean;
  onlyAdminsCanInvite: boolean;
  onlyAdminsCanMessage: boolean;
  slowMode: number; // Seconds between messages, 0 means disabled
  maxParticipants: number;
}

export interface BannedUser {
  userId: User;
  bannedBy: User;
  reason?: string;
  bannedAt: string;
  expiresAt?: string;
}

export interface ChatInvite {
  code: string;
  createdBy: User;
  maxUses: number; // 0 means unlimited
  uses: number;
  expiresAt?: string;
}

export interface Reaction {
  _id: string;
  emoji: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
}

export interface Thread {
  _id: string;
  originalMessage: Message;
  participants: string[];
  messageCount: number;
  lastActivity: string;
  unreadCounts: Array<{
    userId: string;
    count: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  _id: string;
  content: string;
  type: 'text' | 'event' | 'poll' | 'rules';
  createdBy: {
    _id: string;
    name: string;
    avatar?: string;
  };
  pinned: boolean;
  expiresAt?: string;
  metadata?: {
    eventDate?: string;
    location?: string;
    options?: Array<{
      text: string;
      votes: Array<{
        userId: string;
        votedAt: string;
      }>;
    }>;
    allowMultipleVotes?: boolean;
    endDate?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface VoiceMessage {
  _id: string;
  url: string;
  duration: number;
  sender: User;
  chat: string;
  waveform: number[];
  status: 'sending' | 'sent' | 'delivered' | 'played';
  messageRef: string;
  transcription?: {
    text: string;
    confidence: number;
    language: string;
    isProcessing: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  chatId: string;
  sender: User;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'location' | 'contact' | 'audio' | 'video';
  replyTo?: Message;
  edited?: boolean;
  editedAt?: string;
  isEdited?: boolean;
  readBy?: MessageRead[];
  reactions?: Reaction[];
  threadId?: string;
  isThreadStarter?: boolean;
  threadInfo?: {
    replyCount: number;
    lastReplyAt?: string;
    lastReplyBy?: string;
  };
  voiceMessageId?: string; // Added for voice messages
  createdAt: string;
  updatedAt: string;
}

export interface MessageRead {
  user: string;
  readAt: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
}

export interface RegisterData {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
}