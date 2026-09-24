import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { extractErrorMessage } from '@/api/client';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TextField } from '@/components/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';

// Mirrors backend/app/schemas/auth.py RegisterRequest — keep in sync.
const MIN_PASSWORD_LENGTH = 8;

type Field = 'email' | 'nic' | 'password' | 'confirmPassword';

function emailError(value: string): string | undefined {
  if (!value.includes('@')) return 'Enter a valid email address.';
  return undefined;
}

function nicError(value: string): string | undefined {
  if (value.trim().length < 5) return 'Enter a valid NIC.';
  return undefined;
}

function passwordError(value: string): string | undefined {
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return undefined;
}

function confirmPasswordError(value: string, password: string): string | undefined {
  if (value !== password) return 'Passwords do not match.';
  return undefined;
}

export default function RegisterScreen() {
  const { register } = useAuth();
  const theme = useTheme();
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

  async function handleSubmit() {
    setTouched({ email: true, nic: true, password: true, confirmPassword: true });
    if (hasAnyFieldError) {
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
        <View style={[styles.badge, { backgroundColor: theme.primary }]}>
          <Ionicons name="shield-checkmark" size={36} color={theme.onPrimary} />
        </View>
        <ThemedText type="title" style={styles.title}>
          iPermit
        </ThemedText>
        <ThemedText type="subtitle">Create a driver account</ThemedText>

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          onBlur={() => markTouched('email')}
          error={touched.email ? fieldErrors.email : undefined}
          keyboardType="email-address"
          testID="register-email"
        />
        <TextField
          label="NIC"
          value={nic}
          onChangeText={setNic}
          onBlur={() => markTouched('nic')}
          error={touched.nic ? fieldErrors.nic : undefined}
          testID="register-nic"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          onBlur={() => markTouched('password')}
          error={touched.password ? fieldErrors.password : undefined}
          secureTextEntry
          testID="register-password"
        />
        <TextField
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          onBlur={() => markTouched('confirmPassword')}
          error={touched.confirmPassword ? fieldErrors.confirmPassword : undefined}
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
  badge: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  title: { textAlign: 'center' },
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
});
