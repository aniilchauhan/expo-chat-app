import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
} from 'react-native-webrtc';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../config';
import { CallConfig, CallState, SignalingMessage } from '../types/webrtc';

class WebRTCService {
  private socket: Socket | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: any = null;
  private config: CallConfig | null = null;
  private currentCall: CallState | null = null;
  private onCallStateChange: ((call: CallState) => void) | null = null;

  constructor() {
    this.initializeSocket();
    this.fetchConfig();
  }

  private async fetchConfig() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/webrtc/config`, {
        headers: {
          Authorization: `Bearer ${await this.getAuthToken()}`,
        },
      });
      const data = await response.json();
      this.config = data.config;
    } catch (error) {
      console.error('Error fetching WebRTC config:', error);
    }
  }

  private async getAuthToken(): Promise<string> {
    // Implement your token retrieval logic
    return '';
  }

  private initializeSocket() {
    if (this.socket) return;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: {
        userId: '', // Set this when initializing the service
        userName: '',
        userAvatar: '',
      },
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('call:incoming', this.handleIncomingCall);
    this.socket.on('call:accepted', this.handleCallAccepted);
    this.socket.on('call:ended', this.handleCallEnded);
    this.socket.on('call:participantLeft', this.handleParticipantLeft);
    this.socket.on('signal', this.handleSignalingMessage);
  }

  private handleIncomingCall = async (data: {
    callId: string;
    fromUserId: string;
    type: 'audio' | 'video';
    isGroupCall: boolean;
  }) => {
    // Implement incoming call handling
    this.currentCall = {
      callId: data.callId,
      type: data.type,
      status: 'ringing',
      participants: [],
      isGroupCall: data.isGroupCall,
      startedAt: new Date().toISOString(),
    };
    this.notifyCallStateChange();
  };

  private handleCallAccepted = async (data: { callId: string; userId: string }) => {
    if (!this.currentCall || this.currentCall.callId !== data.callId) return;

    this.currentCall.status = 'connected';
    this.notifyCallStateChange();

    // Create peer connection for the new participant
    await this.createPeerConnection(data.userId);
  };

  private handleCallEnded = (data: { callId: string; userId: string }) => {
    if (!this.currentCall || this.currentCall.callId !== data.callId) return;

    this.endCall();
  };

  private handleParticipantLeft = (data: { callId: string; userId: string }) => {
    if (!this.currentCall || this.currentCall.callId !== data.callId) return;

    // Remove participant from call state
    this.currentCall.participants = this.currentCall.participants.filter(
      (p) => p.userId !== data.userId
    );
    this.notifyCallStateChange();

    // Clean up peer connection
    this.cleanupPeerConnection(data.userId);
  };

  private handleSignalingMessage = async (message: SignalingMessage) => {
    if (!this.currentCall || this.currentCall.callId !== message.callId) return;

    const pc = this.peerConnections.get(message.fromUserId);
    if (!pc) return;

    try {
      switch (message.type) {
        case 'offer':
          await pc.setRemoteDescription(new RTCSessionDescription(message.payload));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          this.sendSignalingMessage({
            type: 'answer',
            callId: message.callId,
            fromUserId: message.toUserId!,
            toUserId: message.fromUserId,
            payload: answer,
          });
          break;

        case 'answer':
          await pc.setRemoteDescription(new RTCSessionDescription(message.payload));
          break;

        case 'candidate':
          await pc.addIceCandidate(new RTCIceCandidate(message.payload));
          break;
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
    }
  };

  private async createPeerConnection(userId: string) {
    if (!this.config) return;

    const pc = new RTCPeerConnection({
      iceServers: this.config.iceServers,
    });

    // Add local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track: any) => {
        pc.addTrack(track, this.localStream);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.currentCall) {
        this.sendSignalingMessage({
          type: 'candidate',
          callId: this.currentCall.callId,
          fromUserId: '', // Set this when initializing the service
          toUserId: userId,
          payload: event.candidate,
        });
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      if (!this.currentCall) return;

      const participant = this.currentCall.participants.find((p) => p.userId === userId);
      if (participant) {
        participant.stream = event.streams[0];
        this.notifyCallStateChange();
      }
    };

    this.peerConnections.set(userId, pc);
    return pc;
  }

  private cleanupPeerConnection(userId: string) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(userId);
    }
  }

  private sendSignalingMessage(message: SignalingMessage) {
    this.socket?.emit('signal', message);
  }

  private notifyCallStateChange() {
    if (this.currentCall && this.onCallStateChange) {
      this.onCallStateChange(this.currentCall);
    }
  }

  public async initializeCall(userId: string, type: 'audio' | 'video', isGroupCall = false) {
    if (!this.socket || !this.config) return;

    try {
      // Request media stream
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });

      this.localStream = stream;

      // Emit call initiation event
      this.socket.emit('call:initiate', {
        type,
        toUserId: userId,
        isGroupCall,
      });
    } catch (error) {
      console.error('Error initializing call:', error);
      throw error;
    }
  }

  public async acceptCall(callId: string) {
    if (!this.socket || !this.currentCall || this.currentCall.callId !== callId) return;

    try {
      // Request media stream if not already available
      if (!this.localStream) {
        this.localStream = await mediaDevices.getUserMedia({
          audio: true,
          video: this.currentCall.type === 'video',
        });
      }

      this.socket.emit('call:accept', { callId });
    } catch (error) {
      console.error('Error accepting call:', error);
      throw error;
    }
  }

  public endCall() {
    if (!this.socket || !this.currentCall) return;

    this.socket.emit('call:end', { callId: this.currentCall.callId });

    // Cleanup
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track: any) => track.stop());
      this.localStream = null;
    }

    this.currentCall = null;
    this.notifyCallStateChange();
  }

  public setOnCallStateChange(callback: (call: CallState) => void) {
    this.onCallStateChange = callback;
  }

  public getCurrentCall(): CallState | null {
    return this.currentCall;
  }

  public getLocalStream(): any {
    return this.localStream;
  }

  public toggleAudio(enabled: boolean) {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = enabled;
      }
    }
  }

  public toggleVideo(enabled: boolean) {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = enabled;
      }
    }
  }

  public async switchCamera() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          await videoTrack._switchCamera();
        } catch (error) {
          console.error('Error switching camera:', error);
        }
      }
    }
  }
}

export default new WebRTCService();
