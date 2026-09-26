import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput } from 'react-native';

import { extractErrorMessage } from '@/api/client';
import { AuthHeader } from '@/components/auth-header';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TextField } from '@/components/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const theme = useTheme();
  const passwordRef = useRef<TextInput>(null);
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
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
    >
      <ThemedView style={styles.form}>
        <AuthHeader subtitle="Log in to your account" />

        <TextField
          label="Email or NIC"
          value={identifier}
          onChangeText={setIdentifier}
          keyboardType="email-address"
          autoComplete="username"
          textContentType="username"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
          testID="login-identifier"
        />
        <TextField
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={canSubmit ? handleSubmit : undefined}
          testID="login-password"
        />

        {error ? (
          <ThemedText
            type="small"
            themeColor="danger"
            selectable
            accessibilityLiveRegion="polite"
            testID="login-error"
          >
            {error}
          </ThemedText>
        ) : null}

        <Button
          variant="primary"
          disabled={!canSubmit}
          onPress={handleSubmit}
          testID="login-submit"
        >
          {isSubmitting ? <ActivityIndicator color={theme.onPrimary} /> : null}
          <ThemedText type="smallBold" themeColor="onPrimary">
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </ThemedText>
        </Button>

        <Link href="/(auth)/register" testID="login-go-register" style={styles.centered}>
          <ThemedText type="link">
            Don&apos;t have an account? <ThemedText type="linkPrimary">Register</ThemedText>
          </ThemedText>
        </Link>

        <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
          Police officers: sign in with the account issued by your station.
        </ThemedText>
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
  centered: { textAlign: 'center' },
});
