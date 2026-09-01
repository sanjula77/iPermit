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

// Mirrors backend/app/schemas/auth.py RegisterRequest — keep in sync.
const MIN_PASSWORD_LENGTH = 8;

export default function RegisterScreen() {
  const { register } = useAuth();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [nic, setNic] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): string | null {
    if (!email.includes('@')) return 'Enter a valid email address.';
    if (nic.trim().length < 5) return 'Enter a valid NIC.';
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await register(email.trim(), nic.trim(), password);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

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
        <ThemedText type="subtitle">Create a driver account</ThemedText>

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          testID="register-email"
        />
        <TextField label="NIC" value={nic} onChangeText={setNic} testID="register-nic" />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          testID="register-password"
        />
        <TextField
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          testID="register-confirm-password"
        />

        {error ? (
          <ThemedText type="small" themeColor="danger" selectable testID="register-error">
            {error}
          </ThemedText>
        ) : null}

        <Pressable
          style={[styles.button, { backgroundColor: theme.primary }, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          testID="register-submit"
        >
          <ThemedText type="smallBold" themeColor="onPrimary">
            {isSubmitting ? 'Creating account…' : 'Register'}
          </ThemedText>
        </Pressable>

        <Link href="/(auth)/login" testID="register-go-login">
          <ThemedText type="link">Already have an account? Log in</ThemedText>
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
