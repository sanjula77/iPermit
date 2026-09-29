import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The login and register layout (they have no navigation header): the brand
// gradient carries the logo and title, and the form sits on a raised card that
// overlaps it -- the same language as the signed-in hero screens.
export function AuthScreen({ subtitle, children }: { subtitle: string; children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

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
          <View style={styles.logo}>
            <Ionicons name="shield-checkmark" size={36} color={theme.onBrand} />
          </View>
          <ThemedText type="title" themeColor="onBrand" style={styles.centered} accessibilityRole="header">
            iPermit
          </ThemedText>
          <ThemedText themeColor="onBrand" style={[styles.centered, styles.dim]}>
            {subtitle}
          </ThemedText>
        </LinearGradient>
        <View style={styles.sheet}>
          <Card variant="raised" style={styles.card}>
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
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    // Room for the card to overlap.
    paddingBottom: Spacing.six + Spacing.four,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
    // Translucent white: only used on the brand gradient.
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  centered: { textAlign: 'center' },
  dim: { opacity: 0.85 },
  sheet: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
    marginTop: -Spacing.six,
  },
  card: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.large,
  },
  statusStrip: { position: 'absolute', top: 0, left: 0, right: 0 },
});
