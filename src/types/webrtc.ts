export interface RTCPeerConfig {
  iceServers: RTCIceServer[];
  iceCandidatePoolSize?: number;
}

export interface RTCIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface CallParticipant {
  userId: string;
  name: string;
  avatar?: string;
  stream?: any; // MediaStream in web, but different in React Native
  audioEnabled: boolean;
  videoEnabled: boolean;
}

export interface CallState {
  callId: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'connected' | 'ended';
  participants: CallParticipant[];
  isGroupCall: boolean;
  startedAt: string;
  endedAt?: string;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'candidate' | 'leave';
  callId: string;
  fromUserId: string;
  toUserId?: string;
  payload: any;
}

export interface CallConfig {
  maxParticipants: number;
  audioEnabled: boolean;
  videoEnabled: boolean;
  enableScreenSharing: boolean;
  maxCallDuration: number;
  iceServers: RTCIceServer[];
}

export type CallEvents = {
  'call:incoming': (data: { callId: string; fromUserId: string; type: 'audio' | 'video'; isGroupCall: boolean }) => void;
  'call:initiated': (data: { callId: string }) => void;
  'call:accepted': (data: { callId: string; userId: string }) => void;
  'call:ended': (data: { callId: string; userId: string }) => void;
  'call:error': (data: { message: string }) => void;
  'call:participantLeft': (data: { callId: string; userId: string }) => void;
  'signal': (message: SignalingMessage) => void;
};
