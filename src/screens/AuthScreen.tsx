import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { TextInput, Button, Card, Title, Paragraph } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { RegisterData } from '../types';

const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });

  // Register form state
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    username: '',
    firstName: '',
    lastName: '',
  });

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerForm.email || !registerForm.password || !registerForm.username || 
        !registerForm.firstName || !registerForm.lastName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await register(registerForm as RegisterData);
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.content}>
            <Title style={styles.title}>Welcome to ChatApp</Title>
            <Paragraph style={styles.subtitle}>
              Connect and chat with friends in real-time
            </Paragraph>

            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.tabContainer}>
                  <Button
                    mode={isLogin ? 'contained' : 'outlined'}
                    onPress={() => setIsLogin(true)}
                    style={styles.tabButton}
                  >
                    Login
                  </Button>
                  <Button
                    mode={!isLogin ? 'contained' : 'outlined'}
                    onPress={() => setIsLogin(false)}
                    style={styles.tabButton}
                  >
                    Register
                  </Button>
                </View>

                {isLogin ? (
                  <View style={styles.form}>
                    <TextInput
                      label="Email"
                      value={loginForm.email}
                      onChangeText={(text) =>
                        setLoginForm({ ...loginForm, email: text })
                      }
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={styles.input}
                    />
                    <TextInput
                      label="Password"
                      value={loginForm.password}
                      onChangeText={(text) =>
                        setLoginForm({ ...loginForm, password: text })
                      }
                      secureTextEntry
                      style={styles.input}
                    />
                    <Button
                      mode="contained"
                      onPress={handleLogin}
                      loading={isLoading}
                      disabled={isLoading}
                      style={styles.submitButton}
                    >
                      Login
                    </Button>
                  </View>
                ) : (
                  <View style={styles.form}>
                    <View style={styles.nameRow}>
                      <TextInput
                        label="First Name"
                        value={registerForm.firstName}
                        onChangeText={(text) =>
                          setRegisterForm({ ...registerForm, firstName: text })
                        }
                        style={[styles.input, styles.halfInput]}
                      />
                      <TextInput
                        label="Last Name"
                        value={registerForm.lastName}
                        onChangeText={(text) =>
                          setRegisterForm({ ...registerForm, lastName: text })
                        }
                        style={[styles.input, styles.halfInput]}
                      />
                    </View>
                    <TextInput
                      label="Username"
                      value={registerForm.username}
                      onChangeText={(text) =>
                        setRegisterForm({ ...registerForm, username: text })
                      }
                      autoCapitalize="none"
                      style={styles.input}
                    />
                    <TextInput
                      label="Email"
                      value={registerForm.email}
                      onChangeText={(text) =>
                        setRegisterForm({ ...registerForm, email: text })
                      }
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={styles.input}
                    />
                    <TextInput
                      label="Password"
                      value={registerForm.password}
                      onChangeText={(text) =>
                        setRegisterForm({ ...registerForm, password: text })
                      }
                      secureTextEntry
                      style={styles.input}
                    />
                    <Button
                      mode="contained"
                      onPress={handleRegister}
                      loading={isLoading}
                      disabled={isLoading}
                      style={styles.submitButton}
                    >
                      Register
                    </Button>
                  </View>
                )}
              </Card.Content>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },
  card: {
    width: '100%',
    maxWidth: 400,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  form: {
    width: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  input: {
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  submitButton: {
    marginTop: 8,
  },
});

export default AuthScreen;
