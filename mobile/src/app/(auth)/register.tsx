import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ApiError, extractErrorMessage } from '@/api/client';
import { AuthHeader } from '@/components/auth-header';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TextField } from '@/components/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';

// Mirrors backend/app/schemas/auth.py RegisterRequest — keep in sync.
const MIN_PASSWORD_LENGTH = 8;
const MIN_NIC_LENGTH = 5;

type Field = 'email' | 'nic' | 'password' | 'confirmPassword';

function emailError(value: string): string | undefined {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Enter a valid email address.';
  return undefined;
}

function nicError(value: string): string | undefined {
  if (value.trim().length < MIN_NIC_LENGTH) return 'Enter a valid NIC.';
  return undefined;
}

function passwordError(value: string): string | undefined {
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return undefined;
}

function confirmPasswordError(value: string, password: string): string | undefined {
  if (value.length === 0) return 'Confirm your password.';
  if (value !== password) return 'Passwords do not match.';
  return undefined;
}

// The input a 409 from /auth/register names (already-registered email or NIC).
function conflictingField(err: unknown): { field: 'email' | 'nic'; message: string } | null {
  if (!(err instanceof ApiError) || err.status !== 409) return null;
  const detail = err.detail as { field?: unknown; message?: unknown } | null;
  if ((detail?.field === 'email' || detail?.field === 'nic') && typeof detail.message === 'string') {
    return { field: detail.field, message: detail.message };
  }
  return null;
}

export default function RegisterScreen() {
  const { register } = useAuth();
  const theme = useTheme();
  const nicRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [nic, setNic] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState<Record<Field, boolean>>({
    email: false,
    nic: false,
    password: false,
    confirmPassword: false,
  });
  // Server rejections tied to an input; cleared when that input is edited.
  const [serverErrors, setServerErrors] = useState<Partial<Record<'email' | 'nic', string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function markTouched(field: Field) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  const fieldErrors = {
    email: emailError(email),
    nic: nicError(nic),
    password: passwordError(password),
    confirmPassword: confirmPasswordError(confirmPassword, password),
  };
  const hasAnyFieldError = Object.values(fieldErrors).some((e) => e !== undefined);
  const isFilled = [email.trim(), nic.trim(), password, confirmPassword].every((v) => v.length > 0);
  const canSubmit = isFilled && !isSubmitting;

  async function handleSubmit() {
    setTouched({ email: true, nic: true, password: true, confirmPassword: true });
    if (hasAnyFieldError) {
      return;
    }
    setError(null);
    setServerErrors({});
    setIsSubmitting(true);
    try {
      await register(email.trim(), nic.trim(), password);
    } catch (err) {
      const conflict = conflictingField(err);
      if (conflict) {
        setServerErrors({ [conflict.field]: conflict.message });
      } else {
        setError(extractErrorMessage(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

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
        <AuthHeader subtitle="Create a driver account" />

        <TextField
          label="Email"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setServerErrors((prev) => ({ ...prev, email: undefined }));
          }}
          onBlur={() => markTouched('email')}
          error={(touched.email ? fieldErrors.email : undefined) ?? serverErrors.email}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => nicRef.current?.focus()}
          testID="register-email"
        />
        <TextField
          ref={nicRef}
          label="NIC"
          value={nic}
          onChangeText={(value) => {
            setNic(value);
            setServerErrors((prev) => ({ ...prev, nic: undefined }));
          }}
          onBlur={() => markTouched('nic')}
          error={(touched.nic ? fieldErrors.nic : undefined) ?? serverErrors.nic}
          hint="As printed on your National Identity Card"
          autoCapitalize="characters"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
          testID="register-nic"
        />
        <TextField
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          onBlur={() => markTouched('password')}
          error={touched.password ? fieldErrors.password : undefined}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => confirmPasswordRef.current?.focus()}
          testID="register-password"
        />
        <TextField
          ref={confirmPasswordRef}
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          onBlur={() => markTouched('confirmPassword')}
          error={touched.confirmPassword ? fieldErrors.confirmPassword : undefined}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={canSubmit ? handleSubmit : undefined}
          testID="register-confirm-password"
        />

        {error ? (
          <ThemedText
            type="small"
            themeColor="danger"
            selectable
            accessibilityLiveRegion="polite"
            testID="register-error"
          >
            {error}
          </ThemedText>
        ) : null}

        <Button
          variant="primary"
          disabled={!canSubmit}
          onPress={handleSubmit}
          testID="register-submit"
        >
          {isSubmitting ? <ActivityIndicator color={theme.onPrimary} /> : null}
          <ThemedText type="smallBold" themeColor="onPrimary">
            {isSubmitting ? 'Creating account…' : 'Register'}
          </ThemedText>
        </Button>

        <Link href="/(auth)/login" testID="register-go-login" style={styles.centered}>
          <ThemedText type="link">
            Already have an account? <ThemedText type="linkPrimary">Log in</ThemedText>
          </ThemedText>
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
  centered: { textAlign: 'center' },
});
