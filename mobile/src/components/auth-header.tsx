import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Brand block at the top of the login and register screens (they have no
// navigation header to carry the title).
export function AuthHeader({ subtitle }: { subtitle: string }) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.badge, { backgroundColor: theme.primary }]}>
        <Ionicons name="shield-checkmark" size={36} color={theme.onPrimary} />
      </View>
      <ThemedText type="title" style={styles.centered} accessibilityRole="header">
        iPermit
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.centered}>
        {subtitle}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  centered: { textAlign: 'center' },
});
