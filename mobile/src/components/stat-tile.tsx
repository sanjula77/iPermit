import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { IconTile } from '@/components/icon-tile';
import { ThemedText } from '@/components/themed-text';
import { Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// A small tile with one figure: an optional icon and a one-line label on top, the
// figure, then an optional one-line note. Every line is one line, so tiles side by
// side line up whatever the system font size; the figure shrinks rather than wraps.
export function StatTile({
  label,
  value,
  sub,
  icon,
  accent,
  valueColor = 'text',
  compact = false,
  variant = 'raised',
  testID,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  // Colour of the icon; defaults to the figure's colour.
  accent?: ThemeColor;
  valueColor?: ThemeColor;
  // A smaller figure, for three across.
  compact?: boolean;
  variant?: 'raised' | 'flat';
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <Card variant={variant} style={[styles.tile, compact && styles.tileCompact]} testID={testID}>
      <View style={styles.head}>
        {icon ? <IconTile icon={icon} color={theme[accent ?? valueColor]} size={24} /> : null}
        <ThemedText
          type="small"
          themeColor="textSecondary"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          style={styles.label}
        >
          {label}
        </ThemedText>
      </View>
      <ThemedText
        themeColor={valueColor}
        numberOfLines={1}
        adjustsFontSizeToFit
        // Low floor: at large system fonts a figure must shrink, never truncate
        // ("LKR 12…" would misstate the amount).
        minimumFontScale={0.5}
        style={[styles.value, compact && styles.valueCompact]}
      >
        {value}
      </ThemedText>
      {sub ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {sub}
        </ThemedText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minWidth: 0, gap: Spacing.one, padding: Spacing.three },
  tileCompact: { padding: Spacing.three - 2, gap: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + 2, minHeight: 28 },
  label: { flex: 1, minWidth: 0 },
  value: { fontSize: 20, lineHeight: 26, fontWeight: 700, fontVariant: ['tabular-nums'] },
  valueCompact: { fontSize: 18, lineHeight: 24 },
});
