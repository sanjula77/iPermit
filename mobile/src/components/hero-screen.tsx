import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactElement, ReactNode, Ref } from 'react';
import { Platform, ScrollView, StyleSheet, View, type RefreshControlProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Style-B summary screen: a brand gradient hero holding the screen's key figure,
// with the content on a rounded sheet that overlaps the hero's lower edge.
// Used with the native header hidden, so the hero draws under the status bar.
// A fixed brand strip stays behind the status bar once the hero scrolls away,
// so the light status-bar icons never sit on the light canvas.
export function HeroScreen({
  ref,
  title,
  summary,
  heroContent,
  refreshControl,
  keyboardShouldPersistTaps,
  underHeader = false,
  testID,
  children,
}: {
  ref?: Ref<ScrollView>;
  title?: string;
  summary?: string;
  // The key figure and any chip/action, rendered below the title.
  heroContent?: ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  // True on a pushed screen that keeps the blue app bar: the hero continues
  // the bar instead of drawing under the status bar.
  underHeader?: boolean;
  testID?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        ref={ref}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        contentInsetAdjustmentBehavior={underHeader ? 'automatic' : undefined}
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={refreshControl}
        testID={testID}
      >
        {/* Fills the iOS pull-to-refresh overscroll with brand blue, so the
            white spinner (and the bounce) show on blue, not on the grey canvas. */}
        <View pointerEvents="none" style={[styles.overscroll, { backgroundColor: theme.brandDeep }]} />
        <LinearGradient
          colors={[theme.brandDeep, theme.brand, theme.brandBright]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          // iOS: NativeTabs gives this (the tab's first) scroll view automatic
          // content insets, which already include the top safe area. Android
          // only applies the bottom inset, so the top is added here.
          style={[
            styles.hero,
            { paddingTop: (underHeader || Platform.OS === 'ios' ? 0 : insets.top) + Spacing.three },
          ]}
        >
          <View style={styles.inner}>
            {title ? (
              <ThemedText type="subtitle" themeColor="onBrand" accessibilityRole="header">
                {title}
              </ThemedText>
            ) : null}
            {summary ? (
              <ThemedText type="small" themeColor="onBrand" style={styles.summary}>
                {summary}
              </ThemedText>
            ) : null}
            {heroContent ? <View style={styles.heroContent}>{heroContent}</View> : null}
          </View>
        </LinearGradient>
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={[styles.inner, styles.body]}>{children}</View>
        </View>
      </ScrollView>
      {underHeader ? null : (
        <View
          pointerEvents="none"
          style={[styles.statusStrip, { height: insets.top, backgroundColor: theme.brandDeep }]}
        />
      )}
    </View>
  );
}

// A status chip that reads on the blue hero. Translucent white is local to the
// hero: it's the only surface in the app that sits on the brand gradient.
export function HeroChip({
  icon,
  label,
  large = false,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  // The screen's headline result (e.g. a driver's license status).
  large?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.chip, large && styles.chipLarge]} testID={testID} accessible accessibilityLabel={label}>
      <Ionicons name={icon} size={large ? 20 : 14} color={theme.onBrand} />
      <ThemedText type={large ? 'default' : 'smallBold'} themeColor="onBrand" numberOfLines={1} style={large && styles.chipLargeText}>
        {label}
      </ThemedText>
    </View>
  );
}

// The hero's one primary action: a white pill with brand-coloured text.
export function HeroAction({
  label,
  icon,
  onPress,
  testID,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      testID={testID}
      hitSlop={4}
      style={styles.actionOuter}
      contentStyle={[styles.action, { backgroundColor: theme.onBrand }]}
    >
      <Ionicons name={icon} size={18} color={theme.brand} />
      <ThemedText type="smallBold" themeColor="brand" numberOfLines={1}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1 },
  statusStrip: { position: 'absolute', top: 0, left: 0, right: 0 },
  overscroll: { position: 'absolute', top: -1000, left: 0, right: 0, height: 1000 },
  hero: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    // Room for the sheet to overlap without covering hero content.
    paddingBottom: Spacing.six,
  },
  inner: { width: '100%', maxWidth: MaxContentWidth },
  summary: { opacity: 0.85 },
  heroContent: { marginTop: Spacing.three, gap: Spacing.two, alignItems: 'flex-start' },
  sheet: {
    flexGrow: 1,
    alignItems: 'center',
    marginTop: -Spacing.five,
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
  },
  body: { gap: Spacing.four },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two + Spacing.half,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  chipLarge: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, gap: Spacing.two },
  chipLargeText: { fontWeight: 700 },
  actionOuter: { alignSelf: 'flex-start', marginTop: Spacing.one },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingHorizontal: Spacing.four,
    borderRadius: 999,
  },
});
