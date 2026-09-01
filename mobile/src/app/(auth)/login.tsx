import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { extractErrorMessage } from '@/api/client';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TextField } from '@/components/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

export default function LoginScreen() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(identifier.trim(), password);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = identifier.trim().length > 0 && password.length > 0 && !isSubmitting;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          iPermit
        </ThemedText>
        <ThemedText type="subtitle">Log in</ThemedText>

        <TextField
          label="Email or NIC"
          value={identifier}
          onChangeText={setIdentifier}
          keyboardType="email-address"
          testID="login-identifier"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          testID="login-password"
        />

        {error ? (
          <ThemedText type="small" style={styles.error} testID="login-error">
            {error}
          </ThemedText>
        ) : null}

        <Pressable
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          testID="login-submit"
        >
          <ThemedText type="smallBold" style={styles.buttonText}>
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </ThemedText>
        </Pressable>

        <Link href="/(auth)/register" testID="login-go-register">
          <ThemedText type="link">Don&apos;t have an account? Register</ThemedText>
        </Link>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  title: { textAlign: 'center' },
  error: { color: '#d92d20' },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#ffffff' },
});
