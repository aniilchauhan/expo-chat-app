import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { TextInput, Button, Card, Title, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

const LoginScreen: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const getIdentifierType = (value: string): string => {
    if (value.includes('@')) return 'email';
    if (/^\d{10}$/.test(value)) return 'phone';
    return 'userId';
  };

  const validateIdentifier = (value: string): boolean => {
    const type = getIdentifierType(value);
    if (type === 'email') {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }
    if (type === 'phone') {
      return /^\d{10}$/.test(value);
    }
    return value.length >= 4; // For userId
  };

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validateIdentifier(identifier)) {
      Alert.alert('Error', 'Please enter a valid email, phone number, or user ID');
      return;
    }

    setIsLoading(true);
    try {
      await login(identifier, password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.content}>
          <Title style={[styles.title, { color: colors.text }]}>Welcome Back</Title>
          
          <Card style={[styles.card, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <TextInput
                label="Email / Phone / User ID"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                style={styles.input}
                keyboardType={getIdentifierType(identifier) === 'phone' ? 'phone-pad' : 'default'}
              />
              <HelperText type="info" visible={true}>
                Enter your email, phone number, or user ID
              </HelperText>
              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
              />
              <Button
                mode="contained"
                onPress={handleLogin}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
              >
                Login
              </Button>
              <TouchableOpacity
                onPress={() => navigation.navigate('Forgot')}
                style={styles.forgotLink}
              >
                <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
              </TouchableOpacity>
            </Card.Content>
          </Card>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  forgotLink: {
    marginTop: 12,
    alignSelf: 'center',
  },
  forgotText: {
    fontWeight: '600',
  },
});

export default LoginScreen;