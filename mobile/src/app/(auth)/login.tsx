import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { extractErrorMessage } from '@/api/client';
import { AuthScreen } from '@/components/auth-screen';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/text-field';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const theme = useTheme();
  const passwordRef = useRef<TextInput>(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(identifier.trim(), password, remember);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = identifier.trim().length > 0 && password.length > 0 && !isSubmitting;

  return (
    <AuthScreen subtitle="Log in to your account">
      <TextField
        label="Email or NIC"
        icon="mail-outline"
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
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={canSubmit ? handleSubmit : undefined}
        testID="login-password"
      />

      <View style={styles.optionsRow}>
        <Checkbox label="Remember me" checked={remember} onChange={setRemember} testID="login-remember" />
      </View>

      {error ? <Banner tone="danger" text={error} testID="login-error" /> : null}

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
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  centered: { textAlign: 'center' },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: -Spacing.two,
  },
});
