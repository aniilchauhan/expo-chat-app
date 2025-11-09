import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { CallState } from '../types/webrtc';
import webRTCService from '../services/webrtcService';
import { useCallPermissions } from '../hooks/useCallPermissions';

interface CallContextState {
  activeCall: CallState | null;
  isIncomingCall: boolean;
  hasOngoingCall: boolean;
  localStreamEnabled: {
    audio: boolean;
    video: boolean;
  };
}

interface CallContextValue extends CallContextState {
  initiateCall: (userId: string, type: 'audio' | 'video') => Promise<void>;
  acceptCall: (callId: string) => Promise<void>;
  endCall: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  switchCamera: () => Promise<void>;
}

type CallAction =
  | { type: 'SET_ACTIVE_CALL'; payload: CallState | null }
  | { type: 'SET_INCOMING_CALL'; payload: boolean }
  | { type: 'TOGGLE_AUDIO' }
  | { type: 'TOGGLE_VIDEO' };

const initialState: CallContextState = {
  activeCall: null,
  isIncomingCall: false,
  hasOngoingCall: false,
  localStreamEnabled: {
    audio: true,
    video: true,
  },
};

const CallContext = createContext<CallContextValue | undefined>(undefined);

function callReducer(state: CallContextState, action: CallAction): CallContextState {
  switch (action.type) {
    case 'SET_ACTIVE_CALL':
      return {
        ...state,
        activeCall: action.payload,
        hasOngoingCall: !!action.payload,
      };
    case 'SET_INCOMING_CALL':
      return {
        ...state,
        isIncomingCall: action.payload,
      };
    case 'TOGGLE_AUDIO':
      return {
        ...state,
        localStreamEnabled: {
          ...state.localStreamEnabled,
          audio: !state.localStreamEnabled.audio,
        },
      };
    case 'TOGGLE_VIDEO':
      return {
        ...state,
        localStreamEnabled: {
          ...state.localStreamEnabled,
          video: !state.localStreamEnabled.video,
        },
      };
    default:
      return state;
  }
}

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(callReducer, initialState);

  useEffect(() => {
    // Subscribe to call state changes from WebRTC service
    webRTCService.setOnCallStateChange((callState) => {
      dispatch({ type: 'SET_ACTIVE_CALL', payload: callState });
      dispatch({
        type: 'SET_INCOMING_CALL',
        payload: callState?.status === 'ringing' && !isInitiator(callState),
      });
    });

    return () => {
      webRTCService.setOnCallStateChange(() => {}); // Cleanup
    };
  }, []);

  const isInitiator = (callState: CallState) => {
    return callState.participants[0]?.userId === 'currentUserId'; // Replace with actual user ID
  };

  const { checkCallPermissions } = useCallPermissions();

  const initiateCall = async (userId: string, type: 'audio' | 'video') => {
    try {
      // Check permissions before initiating the call
      const hasPermissions = await checkCallPermissions(type);
      if (!hasPermissions) {
        return;
      }

      await webRTCService.initializeCall(userId, type);
    } catch (error) {
      console.error('Error initiating call:', error);
      throw error;
    }
  };

  const acceptCall = async (callId: string) => {
    try {
      // Check permissions before accepting the call
      const callType = state.activeCall?.type || 'video';
      const hasPermissions = await checkCallPermissions(callType);
      if (!hasPermissions) {
        return;
      }

      await webRTCService.acceptCall(callId);
      dispatch({ type: 'SET_INCOMING_CALL', payload: false });
    } catch (error) {
      console.error('Error accepting call:', error);
      throw error;
    }
  };

  const endCall = () => {
    webRTCService.endCall();
    dispatch({ type: 'SET_ACTIVE_CALL', payload: null });
    dispatch({ type: 'SET_INCOMING_CALL', payload: false });
  };

  const toggleAudio = () => {
    const newEnabled = !state.localStreamEnabled.audio;
    webRTCService.toggleAudio(newEnabled);
    dispatch({ type: 'TOGGLE_AUDIO' });
  };

  const toggleVideo = () => {
    const newEnabled = !state.localStreamEnabled.video;
    webRTCService.toggleVideo(newEnabled);
    dispatch({ type: 'TOGGLE_VIDEO' });
  };

  const switchCamera = async () => {
    try {
      await webRTCService.switchCamera();
    } catch (error) {
      console.error('Error switching camera:', error);
      throw error;
    }
  };

  const value: CallContextValue = {
    ...state,
    initiateCall,
    acceptCall,
    endCall,
    toggleAudio,
    toggleVideo,
    switchCamera,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

export const useCall = (): CallContextValue => {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

export default CallContext;
