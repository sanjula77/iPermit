import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { CATEGORY_INFO, VEHICLE_CATEGORIES } from '@/constants/vehicle-categories';
import { formatMonthYear } from '@/lib/format';
import type { License } from '@/types/license';

const WHITE = '#ffffff';
const GLASS = 'rgba(255, 255, 255, 0.2)';
const MAX_ROWS = 4;

// The small round button that turns the card over; the same on both faces.
export function FlipButton({
  onPress,
  label,
  size,
  testID,
}: {
  onPress: () => void;
  label: string;
  size: number;
  testID: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        styles.flip,
        { width: size, height: size, borderRadius: size / 2, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <MaterialCommunityIcons name="rotate-3d-variant" size={Math.round(size * 0.6)} color={WHITE} />
    </Pressable>
  );
}

// The back of the licence card: which vehicles the driver may drive. The held
// categories are listed with what they cover and when they run to; below them
// all thirteen codes are shown with the held ones lit, so the card reads at a
// glance like the printed one.
export function LicenseCardBack({
  license,
  gradient,
  sz,
  onFlip,
}: {
  license: License;
  gradient: readonly [string, string, ...string[]];
  sz: (n: number) => number;
  onFlip: () => void;
}) {
  const held = license.categories;
  const heldCodes = new Set(held.map((c) => c.category));
  // A fourth row is traded for a "+N more" line when more than four are held;
  // the code strip below still shows every one.
  const shown = held.length > MAX_ROWS ? held.slice(0, MAX_ROWS - 1) : held;
  const hidden = held.length - shown.length;

  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.face, { padding: sz(16) }]}
    >
      <View pointerEvents="none" style={[styles.ring, { width: sz(260), height: sz(260), left: -sz(110), bottom: -sz(150) }]} />

      <View style={styles.header}>
        <ThemedText themeColor="onBrand" accessibilityRole="header" style={[styles.title, { fontSize: sz(11) }]}>
          Vehicle categories
        </ThemedText>
        <FlipButton onPress={onFlip} label="Show the front of the card" size={sz(32)} testID="license-flip-front" />
      </View>

      <View style={styles.rows} testID="license-categories">
        {held.length === 0 ? (
          <ThemedText themeColor="onBrand" style={{ fontSize: sz(13), opacity: 0.85 }}>
            No categories on file yet.
          </ThemedText>
        ) : (
          shown.map((item) => {
            const info = CATEGORY_INFO[item.category];
            return (
              <View key={item.category} style={[styles.row, { height: sz(24) }]}>
                <View style={[styles.code, { width: sz(32), height: sz(20), borderRadius: sz(5) }]}>
                  <ThemedText style={[styles.codeText, { fontSize: sz(12), lineHeight: sz(20) }]}>{item.category}</ThemedText>
                </View>
                <View style={[styles.iconCol, { width: sz(20) }]}>
                  <MaterialCommunityIcons name={info.icon} size={sz(16)} color={WHITE} />
                </View>
                <ThemedText themeColor="onBrand" numberOfLines={1} style={[styles.flex, { fontSize: sz(13), lineHeight: sz(24) }]}>
                  {info.label}
                </ThemedText>
                <ThemedText themeColor="onBrand" style={[styles.until, { fontSize: sz(12), lineHeight: sz(24) }]}>
                  to {formatMonthYear(item.expiry_at)}
                </ThemedText>
              </View>
            );
          })
        )}
        {hidden > 0 ? (
          <ThemedText themeColor="onBrand" style={{ fontSize: sz(12), opacity: 0.85 }}>
            +{hidden} more
          </ThemedText>
        ) : null}
      </View>

      <View
        style={styles.strip}
        accessible
        accessibilityLabel={`Categories held: ${held.length ? held.map((c) => c.category).join(', ') : 'none'}`}
      >
        {VEHICLE_CATEGORIES.map((category) => {
          const on = heldCodes.has(category);
          return (
            <View
              key={category}
              style={[
                styles.chip,
                { height: sz(19), borderRadius: sz(4) },
                on ? styles.chipOn : styles.chipOff,
              ]}
            >
              <ThemedText style={[styles.chipText, { fontSize: sz(9.5), lineHeight: sz(19) }, on ? styles.chipTextOn : styles.chipTextOff]}>
                {category}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, opacity: 0.9, includeFontPadding: false },
  flip: { alignItems: 'center', justifyContent: 'center', backgroundColor: GLASS },
  rows: { flex: 1, justifyContent: 'center', gap: 0, paddingVertical: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  code: { alignItems: 'center', justifyContent: 'center', backgroundColor: WHITE },
  codeText: { color: '#0B3D91', fontWeight: 700, textAlign: 'center', includeFontPadding: false },
  iconCol: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
  until: { opacity: 0.85, fontVariant: ['tabular-nums'] },
  strip: { flexDirection: 'row', gap: 3 },
  chip: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  chipOn: { backgroundColor: WHITE, borderColor: WHITE },
  chipOff: { borderColor: 'rgba(255, 255, 255, 0.3)' },
  chipText: { fontWeight: 600, textAlign: 'center', includeFontPadding: false },
  chipTextOn: { color: '#0B3D91' },
  chipTextOff: { color: 'rgba(255, 255, 255, 0.5)' },
});
