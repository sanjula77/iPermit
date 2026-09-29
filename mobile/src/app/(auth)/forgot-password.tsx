import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { Button } from '@/components/button';
import { IconTile } from '@/components/icon-tile';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Self-service password reset isn't available yet (the backend has no reset
// endpoint or email service), so this screen says honestly how to get one.
const STEPS: { icon: 'person-outline' | 'shield-outline'; who: string; how: string }[] = [
  {
    icon: 'person-outline',
    who: 'Drivers',
    how: 'Contact licensing support with your NIC. After they confirm your identity, they will reset your password.',
  },
  {
    icon: 'shield-outline',
    who: 'Police officers',
    how: 'Ask your station administrator, who issued your account, to reset your password.',
  },
];

export default function ForgotPasswordScreen() {
  const theme = useTheme();

  return (
    <AuthScreen subtitle="Reset your password">
      <ThemedText type="subtitle">Forgot your password?</ThemedText>
      <ThemedText themeColor="textSecondary">
        Online password reset isn&apos;t available yet. Here is how to get a new password:
      </ThemedText>

      {STEPS.map((step) => (
        <View key={step.who} style={styles.step}>
          <IconTile icon={step.icon} color={theme.primary} />
          <View style={styles.stepText}>
            <ThemedText type="smallBold">{step.who}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {step.how}
            </ThemedText>
          </View>
        </View>
      ))}

      <Button variant="primary" onPress={() => router.back()} testID="forgot-back-to-login">
        <Ionicons name="arrow-back" size={18} color={theme.onPrimary} />
        <ThemedText type="smallBold" themeColor="onPrimary">
          Back to log in
        </ThemedText>
      </Button>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  stepText: { flex: 1, gap: Spacing.half },
});
