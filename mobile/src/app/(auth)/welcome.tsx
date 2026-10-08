import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInUp, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/logo';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The first screen a signed-out user sees: the logo on the light canvas, and a
// brand-gradient panel below with one line and the one action. Kept bare on
// purpose -- login has the register link. Sign-out and expired sessions skip it.
export default function WelcomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // The lockup is about 3.5x the mark's size wide, so scale the mark to fit narrow phones.
  const logoSize = Math.min(96, Math.max(56, width * 0.215));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="auto" />
      <Animated.View
        entering={FadeIn.duration(600).reduceMotion(ReduceMotion.System)}
        style={[styles.logoArea, { paddingTop: insets.top }]}
      >
        <Logo size={logoSize} />
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(450).reduceMotion(ReduceMotion.System)}>
        <LinearGradient
          colors={[theme.brandDeep, theme.brand, theme.brandBright]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.panel,
            { minHeight: height * 0.4, paddingBottom: Math.max(insets.bottom, Spacing.three) + Spacing.five },
          ]}
        >
          <View style={styles.panelInner}>
            <ThemedText themeColor="onBrand" style={styles.tagline}>
              Your driving licence, always with you.
            </ThemedText>
            <PressableScale
              onPress={() => router.push('/(auth)/login')}
              accessibilityRole="button"
              testID="welcome-get-started"
              contentStyle={[styles.cta, { backgroundColor: theme.onBrand }]}
            >
              <ThemedText type="smallBold" themeColor="brand" style={styles.ctaText}>
                Get Started
              </ThemedText>
            </PressableScale>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  logoArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.four },
  panel: {
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
  },
  panelInner: { width: '100%', maxWidth: 480, gap: Spacing.six },
  tagline: { fontSize: 22, lineHeight: 30, fontWeight: 600, textAlign: 'center' },
  cta: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.four,
  },
  ctaText: { fontSize: 17 },
});
