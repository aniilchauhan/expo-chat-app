import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { authAPI } from '../api';
import { useTheme } from '../contexts/ThemeContext';

const ForgotPasswordScreen: React.FC = () => {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await authAPI.forgotPassword(email);
      setSubmitted(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send reset link');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
      {submitted ? (
        <Text style={[styles.message, { color: colors.text }]}>If an account exists for {email}, a reset link has been sent.</Text>
      ) : (
        <>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>We'll email you a reset link.</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSubmit} disabled={isSubmitting}>
            <Text style={styles.buttonText}>{isSubmitting ? 'Sending…' : 'Send reset link'}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, marginBottom: 12, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
  button: { padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '600' },
  message: { fontSize: 14, textAlign: 'center' },
});

export default ForgotPasswordScreen;


