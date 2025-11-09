import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Message, User } from '../types';
import ChatMessage from './ChatMessage';

interface SwipeableMessageProps {
  message: Message;
  currentUser: User | null;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
}

const SwipeableMessage: React.FC<SwipeableMessageProps> = ({
  message,
  currentUser,
  onReply,
  onEdit,
  onDelete,
}) => {
  const translateX = new Animated.Value(0);
  const isOwn = message.sender._id === currentUser?.id;

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;
      
      if (Math.abs(translationX) > 100) {
        // Trigger reply action
        onReply?.(message);
      }
      
      // Reset position
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <Animated.View style={[styles.container, { transform: [{ translateX }] }]}>
        {/* Reply indicator */}
        <View style={[styles.replyIndicator, isOwn ? styles.replyRight : styles.replyLeft]}>
          <Ionicons name="arrow-undo" size={20} color="#2196f3" />
        </View>
        
        <ChatMessage
          message={message}
          currentUser={currentUser}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  replyIndicator: {
    position: 'absolute',
    top: '50%',
    zIndex: -1,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
  },
  replyLeft: {
    right: 10,
  },
  replyRight: {
    left: 10,
  },
});

export default SwipeableMessage;
