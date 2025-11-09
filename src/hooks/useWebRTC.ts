import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from './useSocket';

// Try to import WebRTC, but make it optional
let RTCPeerConnection: any;
let RTCSessionDescription: any;
let RTCIceCandidate: any;
let mediaDevices: any;
let MediaStream: any;
let isWebRTCAvailable = false;

try {
  const webrtc = require('react-native-webrtc');
  RTCPeerConnection = webrtc.RTCPeerConnection;
  RTCSessionDescription = webrtc.RTCSessionDescription;
  RTCIceCandidate = webrtc.RTCIceCandidate;
  mediaDevices = webrtc.mediaDevices;
  MediaStream = webrtc.MediaStream;
  isWebRTCAvailable = true;
} catch (error) {
  console.warn('WebRTC not available. Voice/Video calls will be disabled.');
  isWebRTCAvailable = false;
}

interface CallState {
  callId: string | null;
  isActive: boolean;
  isIncoming: boolean;
  isOutgoing: boolean;
  type: 'voice' | 'video' | null;
  remoteUser: {
    userId: string;
    displayName: string;
    avatar?: string;
  } | null;
  status: 'idle' | 'initiating' | 'ringing' | 'connecting' | 'connected' | 'ended';
}

interface UseWebRTCOptions {
  onCallEnded?: () => void;
  onCallError?: (error: string) => void;
}

export function useWebRTC(options: UseWebRTCOptions = {}) {
  const socket = useSocket();
  const [callState, setCallState] = useState<CallState>({
    callId: null,
    isActive: false,
    isIncoming: false,
    isOutgoing: false,
    type: null,
    remoteUser: null,
    status: 'idle'
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // ICE servers configuration
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];

  // Initialize peer connection
  const initializePeerConnection = useCallback((callId: string) => {
    if (!isWebRTCAvailable) {
      console.warn('WebRTC not available');
      return null;
    }
    const pc = new RTCPeerConnection({ iceServers });

    // Handle ICE candidates
    pc.onicecandidate = (event: any) => {
      if (event.candidate && socket) {
        socket.emit('webrtc:ice-candidate', {
          callId,
          candidate: event.candidate
        });
      }
    };

    // Handle remote stream
    pc.onaddstream = (event: any) => {
      remoteStreamRef.current = event.stream;
      setRemoteStream(event.stream);
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallState(prev => ({ ...prev, status: 'connected' }));
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        endCall();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [socket]);

  // Get user media
  const getUserMedia = useCallback(async (type: 'voice' | 'video') => {
    if (!isWebRTCAvailable) {
      throw new Error('WebRTC not available. Please use a development build for voice/video calls.');
    }
    try {
      const constraints = {
        audio: true,
        video: type === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      };

      const stream = await mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      options.onCallError?.('Failed to access camera/microphone');
      throw error;
    }
  }, [options]);

  // Initiate call
  const initiateCall = useCallback(async (
    receiverId: string,
    type: 'voice' | 'video',
    chatId?: string
  ) => {
    if (!socket) {
      options.onCallError?.('Socket not connected');
      return;
    }

    try {
      setCallState({
        callId: null,
        isActive: true,
        isIncoming: false,
        isOutgoing: true,
        type,
        remoteUser: null,
        status: 'initiating'
      });

      // Get user media
      const stream = await getUserMedia(type);

      // Emit call initiation
      socket.emit('call:initiate', {
        receiverId,
        type,
        chatId
      });
    } catch (error) {
      console.error('Error initiating call:', error);
      setCallState(prev => ({ ...prev, isActive: false, status: 'idle' }));
    }
  }, [socket, getUserMedia, options]);

  // Answer call
  const answerCall = useCallback(async (callId: string) => {
    if (!socket || !callState.type) return;

    try {
      setCallState(prev => ({ ...prev, status: 'connecting' }));

      // Get user media
      const stream = await getUserMedia(callState.type);

      // Initialize peer connection
      const pc = initializePeerConnection(callId);

      // Add local stream to peer connection
      pc.addStream(stream);

      // Send answer to server
      socket.emit('call:answer', { callId });
    } catch (error) {
      console.error('Error answering call:', error);
      rejectCall(callId);
    }
  }, [socket, callState.type, getUserMedia, initializePeerConnection]);

  // Reject call
  const rejectCall = useCallback((callId: string, reason?: string) => {
    if (!socket) return;

    socket.emit('call:reject', { callId, reason });
    setCallState({
      callId: null,
      isActive: false,
      isIncoming: false,
      isOutgoing: false,
      type: null,
      remoteUser: null,
      status: 'idle'
    });
  }, [socket]);

  // End call
  const endCall = useCallback(() => {
    if (callState.callId && socket) {
      socket.emit('call:end', { callId: callState.callId });
    }

    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: any) => track.stop());
      localStreamRef.current.release();
      localStreamRef.current = null;
      setLocalStream(null);
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setCallState({
      callId: null,
      isActive: false,
      isIncoming: false,
      isOutgoing: false,
      type: null,
      remoteUser: null,
      status: 'idle'
    });

    setRemoteStream(null);
    remoteStreamRef.current = null;

    options.onCallEnded?.();
  }, [callState.callId, socket, options]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, []);

  // Switch camera (front/back)
  const switchCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack._switchCamera();
      }
    }
  }, []);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    socket.on('call:initiated', (data: { callId: string; status: string }) => {
      setCallState(prev => ({
        ...prev,
        callId: data.callId,
        status: 'ringing'
      }));
    });

    socket.on('call:incoming', (data: any) => {
      setCallState({
        callId: data.callId,
        isActive: true,
        isIncoming: true,
        isOutgoing: false,
        type: data.type,
        remoteUser: data.initiator,
        status: 'ringing'
      });
    });

    socket.on('call:answered', async (data: any) => {
      setCallState(prev => ({
        ...prev,
        remoteUser: data.receiver,
        status: 'connecting'
      }));

      const pc = initializePeerConnection(data.callId);

      if (localStreamRef.current) {
        pc.addStream(localStreamRef.current);
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc:offer', { callId: data.callId, offer });
    });

    socket.on('call:rejected', () => {
      options.onCallError?.('Call rejected');
      endCall();
    });

    socket.on('call:ended', () => {
      endCall();
    });

    socket.on('webrtc:offer', async (data: { callId: string; offer: any }) => {
      const pc = peerConnectionRef.current || initializePeerConnection(data.callId);

      if (localStreamRef.current) {
        pc.addStream(localStreamRef.current);
      }

      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc:answer', { callId: data.callId, answer });
    });

    socket.on('webrtc:answer', async (data: { callId: string; answer: any }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    socket.on('webrtc:ice-candidate', async (data: { callId: string; candidate: any }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    socket.on('call:error', (data: { message: string }) => {
      options.onCallError?.(data.message);
      endCall();
    });

    return () => {
      socket.off('call:initiated');
      socket.off('call:incoming');
      socket.off('call:answered');
      socket.off('call:rejected');
      socket.off('call:ended');
      socket.off('webrtc:offer');
      socket.off('webrtc:answer');
      socket.off('webrtc:ice-candidate');
      socket.off('call:error');
    };
  }, [socket, initializePeerConnection, endCall, options]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track: any) => track.stop());
        localStreamRef.current.release();
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  return {
    callState,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    initiateCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
    isWebRTCAvailable
  };
}
