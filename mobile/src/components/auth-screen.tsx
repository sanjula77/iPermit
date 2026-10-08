import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { Logo } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The login and register layout (they have no navigation header): the brand
// gradient carries the logo, and the form sits on a raised card that overlaps
// it -- the same language as the signed-in hero screens. The gradient grows to
// fill spare height, so the card rests at the bottom of tall screens; on short
// ones (or with the keyboard open) the page scrolls. The logo scales with width
// and the card is capped, so tablets get a centred form rather than a stretched one.
const AUTH_MAX_WIDTH = 480;

export function AuthScreen({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const logoSize = Math.min(72, Math.max(44, width * 0.145));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={[theme.brandDeep, theme.brand, theme.brandBright]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + Spacing.five }]}
        >
          <Logo size={logoSize} reversed descriptor={false} />
        </LinearGradient>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.three) + Spacing.three }]}>
          <Card variant="raised" style={styles.card}>
            <ThemedText type="subtitle" themeColor="primary" style={styles.title} accessibilityRole="header">
              {title}
            </ThemedText>
            {children}
          </Card>
        </View>
      </ScrollView>
      {/* Keeps the light status-bar icons on blue if the form scrolls. */}
      <View
        pointerEvents="none"
        style={[styles.statusStrip, { height: insets.top, backgroundColor: theme.brandDeep }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1 },
  hero: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    // Room for the card to overlap.
    paddingBottom: Spacing.six + Spacing.four,
  },
  title: { textAlign: 'center', fontSize: 24, lineHeight: 30, fontWeight: 800, marginBottom: Spacing.one },
  sheet: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    marginTop: -Spacing.six,
  },
  card: {
    width: '100%',
    maxWidth: AUTH_MAX_WIDTH,
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.large,
  },
  statusStrip: { position: 'absolute', top: 0, left: 0, right: 0 },
});
