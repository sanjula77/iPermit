import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, tint, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BannerTone = 'success' | 'danger' | 'warning' | 'info';

const TONE: Record<BannerTone, { color: ThemeColor; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { color: 'success', icon: 'checkmark-circle' },
  danger: { color: 'danger', icon: 'alert-circle' },
  warning: { color: 'warning', icon: 'warning' },
  info: { color: 'textSecondary', icon: 'information-circle' },
};

// Banners explain a state change (a payment went through, a refresh failed), so
// they fade in rather than pop. Module scope: the builder isn't rebuilt per render.
const ENTERING = FadeIn.duration(200).reduceMotion(ReduceMotion.System);

// The one inline message style: action results, refresh failures and notes.
// Announced to screen readers when it appears.
export function Banner({
  tone,
  text,
  title,
  detail,
  icon,
  action,
  testID,
}: {
  tone: BannerTone;
  text: string;
  title?: string;
  // Secondary guidance under the message (e.g. what to do next).
  detail?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action?: { label: string; onPress: () => void; testID?: string };
  testID?: string;
}) {
  const theme = useTheme();
  const { color, icon: defaultIcon } = TONE[tone];

  return (
    <Animated.View
      entering={ENTERING}
      style={[styles.banner, { backgroundColor: tint(theme[color], 'subtle') }]}
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      <Ionicons name={icon ?? defaultIcon} size={18} color={theme[color]} style={styles.icon} />
      <View style={styles.body}>
        {title ? (
          <ThemedText type="smallBold" themeColor={color}>
            {title}
          </ThemedText>
        ) : null}
        <ThemedText type="small" themeColor={color} selectable>
          {text}
        </ThemedText>
        {detail ? (
          <ThemedText type="small" themeColor="textSecondary">
            {detail}
          </ThemedText>
        ) : null}
        {action ? (
          <Pressable
            onPress={action.onPress}
            accessibilityRole="button"
            testID={action.testID}
            style={({ pressed }) => [styles.action, { opacity: pressed ? 0.6 : 1 }]}
          >
            <ThemedText type="linkPrimary">{action.label}</ThemedText>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
  },
  icon: { marginTop: Spacing.half },
  body: { flex: 1, gap: Spacing.one },
  // 48dp touch target for the text link.
  action: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center' },
});
