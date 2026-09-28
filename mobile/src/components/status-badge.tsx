import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, tint, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const TONE_COLOR: Record<StatusTone, ThemeColor> = {
  neutral: 'textSecondary',
  info: 'primary',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
};

// Always icon + label, never color alone, so statuses stay distinguishable
// for color-blind users and in grayscale screenshots.
export function StatusBadge({
  label,
  icon,
  tone = 'neutral',
  testID,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: StatusTone;
  testID?: string;
}) {
  const theme = useTheme();
  const color = theme[TONE_COLOR[tone]];

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={label}
      style={[styles.badge, { backgroundColor: tint(color) }]}
    >
      <Ionicons name={icon} size={14} color={color} />
      <ThemedText type="smallBold" themeColor={TONE_COLOR[tone]} numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
  },
});
