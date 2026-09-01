import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { extractErrorMessage } from '@/api/client';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TextField } from '@/components/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const theme = useTheme();
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <ThemedView style={styles.form}>
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
          <ThemedText type="small" themeColor="danger" selectable testID="login-error">
            {error}
          </ThemedText>
        ) : null}

        <Pressable
          style={[
            styles.button,
            { backgroundColor: theme.primary },
            !canSubmit && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          testID="login-submit"
        >
          <ThemedText type="smallBold" themeColor="onPrimary">
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </ThemedText>
        </Pressable>

        <Link href="/(auth)/register" testID="login-go-register">
          <ThemedText type="link">Don&apos;t have an account? Register</ThemedText>
        </Link>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  form: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  title: { textAlign: 'center' },
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
});
