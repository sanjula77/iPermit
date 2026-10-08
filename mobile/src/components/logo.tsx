import { StyleSheet, View, useColorScheme } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Circle, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';

// The iPermit logo: a blue shield holding an "i" (orange dot, white stem) inside
// light-blue scan brackets -- the face-scan idea. Drawn as vectors so it stays
// sharp at any size. Its colours are the logo's own, not theme tokens, except the
// wordmark, which flips to the theme text colour on the dark canvas.
const SHIELD_FROM = '#0E3C94';
const SHIELD_TO = '#2B7FDB';
const BRACKET = '#8DB8F0';
const ORANGE = '#F5821F';

// `reversed` is the one-colour-ground version for the brand gradient: white shield
// with a blue stem, white brackets, orange dot unchanged.
export function LogoMark({ size = 84, reversed = false }: { size?: number; reversed?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 172 172">
      <Defs>
        <LinearGradient id="shield" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={SHIELD_FROM} />
          <Stop offset="1" stopColor={SHIELD_TO} />
        </LinearGradient>
      </Defs>
      <Path
        d="M4 36V12Q4 4 12 4H36 M136 4H160Q168 4 168 12V36 M168 136V160Q168 168 160 168H136 M36 168H12Q4 168 4 160V136"
        stroke={reversed ? 'rgba(255, 255, 255, 0.6)' : BRACKET}
        strokeWidth={8}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M86 14L140 31V96C140 128 116 146 86 156C56 146 32 128 32 96V31Z"
        fill={reversed ? '#ffffff' : 'url(#shield)'}
        stroke={reversed ? '#ffffff' : 'url(#shield)'}
        strokeWidth={6}
        strokeLinejoin="round"
      />
      <Circle cx={86} cy={57} r={11} fill={ORANGE} />
      <Rect x={76} y={74} width={20} height={50} rx={10} fill={reversed ? SHIELD_FROM : '#ffffff'} />
    </Svg>
  );
}

// Mark + wordmark + descriptor, side by side.
// `reversed` is for the brand gradient (white wordmark); otherwise the colours follow
// the theme's canvas.
export function Logo({
  size = 84,
  reversed = false,
  descriptor = true,
}: {
  size?: number;
  reversed?: boolean;
  // The "DIGITAL DRIVING LICENSE" line under the wordmark.
  descriptor?: boolean;
}) {
  const dark = useColorScheme() === 'dark';
  const wordColor = reversed ? '#ffffff' : dark ? Colors.dark.text : Colors.light.brandDeep;
  const subColor = reversed ? 'rgba(255, 255, 255, 0.8)' : dark ? Colors.dark.textSecondary : Colors.light.textSecondary;

  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel={descriptor ? 'iPermit, digital driving licence' : 'iPermit'}>
      <LogoMark size={size} reversed={reversed} />
      <View style={styles.text}>
        <ThemedText
          numberOfLines={1}
          style={[styles.word, { color: wordColor, fontSize: size * 0.58, lineHeight: size * 0.68 }]}
        >
          iPermit
        </ThemedText>
        {descriptor ? (
          <ThemedText
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.sub, { color: subColor, fontSize: Math.max(size * 0.125, 9) }]}
          >
            DIGITAL DRIVING LICENSE
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  text: { flexShrink: 1 },
  word: { fontWeight: 800, letterSpacing: -0.5 },
  sub: { fontWeight: 600, letterSpacing: 2.4 },
});
