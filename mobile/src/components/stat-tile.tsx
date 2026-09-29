import { StyleSheet } from 'react-native';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, type ThemeColor } from '@/constants/theme';

// A small raised tile with one figure, used in a row under a hero.
export function StatTile({
  label,
  value,
  valueColor = 'text',
  testID,
}: {
  label: string;
  value: string;
  valueColor?: ThemeColor;
  testID?: string;
}) {
  return (
    <Card variant="raised" style={styles.tile} testID={testID}>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {label}
      </ThemedText>
      <ThemedText
        type="subtitle"
        themeColor={valueColor}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        style={styles.value}
      >
        {value}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minWidth: 0, gap: Spacing.half },
  value: { fontVariant: ['tabular-nums'] },
});
