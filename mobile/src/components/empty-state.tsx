import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function EmptyState({
  icon,
  title,
  message,
  action,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  action?: { label: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void; testID?: string };
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.container} testID={testID}>
      <View style={[styles.iconCircle, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name={icon} size={36} color={theme.primary} />
      </View>
      <ThemedText type="subtitle" style={styles.centered}>
        {title}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.centered}>
        {message}
      </ThemedText>
      {action ? (
        <Button variant="primary" onPress={action.onPress} testID={action.testID} style={styles.action}>
          {action.icon ? <Ionicons name={action.icon} size={18} color={theme.onPrimary} /> : null}
          <ThemedText type="smallBold" themeColor="onPrimary">
            {action.label}
          </ThemedText>
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
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  centered: { textAlign: 'center' },
  action: { alignSelf: 'stretch', marginTop: Spacing.three },
});
