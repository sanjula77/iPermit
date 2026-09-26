import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The loading and failed-to-load states every data screen needs. Pass an
// error to show it with a Retry button; with no error it shows a spinner.
export function ScreenState({
  error,
  onRetry,
  testID,
}: {
  error?: string | null;
  onRetry?: () => void;
  testID?: string;
}) {
  const theme = useTheme();

  if (!error) {
    return (
      <View style={styles.container} testID={testID ? `${testID}-loading` : undefined}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID ? `${testID}-error` : undefined}>
      <Ionicons name="cloud-offline-outline" size={36} color={theme.textSecondary} />
      <ThemedText type="subtitle" style={styles.centered}>
        Couldn&apos;t load
      </ThemedText>
      <ThemedText themeColor="textSecondary" selectable style={styles.centered}>
        {error}
      </ThemedText>
      {onRetry ? (
        <Button variant="secondary" onPress={onRetry} style={styles.retry}>
          <Ionicons name="refresh" size={18} color={theme.text} />
          <ThemedText type="smallBold">Retry</ThemedText>
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  centered: { textAlign: 'center' },
  retry: { alignSelf: 'stretch', marginTop: Spacing.three },
});
