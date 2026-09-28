import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Where footer content lines up: past a 40dp IconTile and the row gap.
export const LIST_ROW_TEXT_INSET = 40 + Spacing.three;

// A two-line row: title and value on the first line, meta and badge on the
// second. The value and badge never shrink; the title and meta take what's
// left and truncate with "…" instead of wrapping. So a wide badge can't squeeze
// the text into a narrow column, and every row is the same height.
// `footer` renders below the row, outside its pressable area, for controls
// such as action buttons that need their own touch targets.
export function ListRow({
  leading,
  title,
  value,
  meta,
  badge,
  footer,
  chevron = false,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: {
  leading?: ReactNode;
  title: string;
  value?: string;
  meta?: string;
  badge?: ReactNode;
  footer?: ReactNode;
  chevron?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}) {
  const theme = useTheme();

  const content = (
    <>
      {leading}
      <View style={styles.text}>
        <View style={styles.line}>
          <ThemedText numberOfLines={1} style={styles.shrink}>
            {title}
          </ThemedText>
          {value ? (
            <ThemedText type="smallBold" style={[styles.fixed, styles.tabular]}>
              {value}
            </ThemedText>
          ) : null}
        </View>
        {meta || badge ? (
          <View style={styles.line}>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.shrink}>
              {meta}
            </ThemedText>
            {badge ? <View style={styles.fixed}>{badge}</View> : null}
          </View>
        ) : null}
      </View>
      {chevron ? <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} /> : null}
    </>
  );

  return (
    <View testID={testID} style={styles.container}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : 1 }]}
        >
          {content}
        </Pressable>
      ) : (
        <View style={styles.main} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel}>
          {content}
        </View>
      )}
      {footer ? <View style={[styles.footer, leading ? styles.footerInset : null]}>{footer}</View> : null}
    </View>
  );
}

// Hairline between rows grouped in one card.
export function ListSeparator() {
  const theme = useTheme();
  return <View style={[styles.separator, { backgroundColor: theme.backgroundSelected }]} />;
}

const styles = StyleSheet.create({
  container: { paddingVertical: Spacing.three, gap: Spacing.two },
  main: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  text: { flex: 1, minWidth: 0, gap: Spacing.half },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  shrink: { flexShrink: 1, minWidth: 0 },
  fixed: { flexShrink: 0 },
  tabular: { fontVariant: ['tabular-nums'] },
  footer: { gap: Spacing.two },
  footerInset: { paddingLeft: LIST_ROW_TEXT_INSET },
  separator: { height: StyleSheet.hairlineWidth },
});
