import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getLicensePhotoSource, type PhotoSource } from '@/api/licenses';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { FlipButton, LicenseCardBack } from '@/components/license-card-back';
import { LogoMark } from '@/components/logo';
import type { StatusTone } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Shadows, Spacing, tint } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMonthYear } from '@/lib/format';
import { SUSPENSION_POINTS, pointsColorKey } from '@/lib/points';
import type { BadgeTier } from '@/types/badge';
import type { License } from '@/types/license';

// AT_RISK and SUSPENDED intentionally share "danger" -- both are genuinely
// bad standing -- but each gets a distinct icon below so they never rely on
// color alone to be told apart.
export const TIER_TONE: Record<BadgeTier, StatusTone> = {
  PLATINUM: 'success',
  GOLD: 'info',
  SILVER: 'neutral',
  BRONZE: 'warning',
  AT_RISK: 'danger',
  SUSPENDED: 'danger',
};

export const TIER_ICON: Record<BadgeTier, keyof typeof Ionicons.glyphMap> = {
  PLATINUM: 'star',
  GOLD: 'medal',
  SILVER: 'medal-outline',
  BRONZE: 'shield-half-outline',
  AT_RISK: 'warning',
  SUSPENDED: 'ban',
};

export const TIER_LABEL: Record<BadgeTier, string> = {
  PLATINUM: 'Platinum',
  GOLD: 'Gold',
  SILVER: 'Silver',
  BRONZE: 'Bronze',
  AT_RISK: 'At risk',
  SUSPENDED: 'Suspended',
};

// The card is a physical-card lookalike (ISO ID-1 proportions), so it keeps its
// own colours in both themes: brand blue when active, deep red when suspended.
const CARD_ASPECT = 1.586;
const DESIGN_WIDTH = 328; // the width the sizes below were drawn at
const SUSPENDED_GRADIENT = ['#5E1510', '#9B241B', '#C8453A'] as const;
const SUSPENDED_RED = '#8A1F17';
const WHITE = '#ffffff';
const CHIP_GOLD = ['#F3D98A', '#C9A24A'] as const;
const CHIP_GREY = ['#D8D8D8', '#9C9C9C'] as const;
const GLASS = 'rgba(255, 255, 255, 0.18)';

// The driver's digital licence as a smart card: brand and status on top, a chip
// and the photo, the number set large like an embossed card number, then NIC and
// expiry. The small button turns it over to the back, which lists the vehicle
// categories the driver may drive. Everything else (QR, demerit points) lives
// outside the card.
export function LicenseCard({ license, nic }: { license: License; nic?: string }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(DESIGN_WIDTH);
  const [flipped, setFlipped] = useState(false);
  const turn = useSharedValue(0);
  const isActive = license.status === 'ACTIVE';
  // Sizes scale with the card so it holds together on narrow phones and tablets.
  const s = Math.min(1.25, Math.max(0.82, width / DESIGN_WIDTH));
  const sz = (n: number) => Math.round(n * s);
  const photo = useLicensePhoto(license.id);
  const gradient = isActive ? ([theme.brandDeep, theme.brand, theme.brandBright] as const) : SUSPENDED_GRADIENT;

  function flip() {
    const next = !flipped;
    setFlipped(next);
    const target = next ? 1 : 0;
    turn.value = reduceMotion ? target : withTiming(target, { duration: 450, easing: Easing.inOut(Easing.cubic) });
  }

  // Two faces back to back; each hides while turned away from the viewer.
  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(turn.value, [0, 1], [0, 180])}deg` }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(turn.value, [0, 1], [180, 360])}deg` }],
  }));

  return (
    <View
      testID="license-card"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.card, { boxShadow: Shadows.raised }]}
    >
      <Animated.View style={[styles.faceWrap, frontStyle]} pointerEvents={flipped ? 'none' : 'auto'}>
        <LicenseFront
          license={license}
          nic={nic}
          photo={photo}
          gradient={gradient}
          sz={sz}
          isActive={isActive}
          onFlip={flip}
        />
      </Animated.View>
      <Animated.View style={[styles.faceWrap, backStyle]} pointerEvents={flipped ? 'auto' : 'none'}>
        <LicenseCardBack license={license} gradient={gradient} sz={sz} onFlip={flip} />
      </Animated.View>
    </View>
  );
}

function LicenseFront({
  license,
  nic,
  photo,
  gradient,
  sz,
  isActive,
  onFlip,
}: {
  license: License;
  nic?: string;
  photo: PhotoSource | null;
  gradient: readonly [string, string, ...string[]];
  sz: (n: number) => number;
  isActive: boolean;
  onFlip: () => void;
}) {
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.face, { padding: sz(16) }]}
    >
      <View pointerEvents="none" style={[styles.ring, { width: sz(260), height: sz(260), right: -sz(90), top: -sz(110) }]} />
      <View pointerEvents="none" style={[styles.ring, { width: sz(190), height: sz(190), right: -sz(50), top: -sz(80) }]} />

      <View style={styles.header}>
        <LogoMark size={sz(28)} reversed />
        <View style={styles.brandText}>
          <ThemedText themeColor="onBrand" style={{ fontSize: sz(16), lineHeight: sz(20), fontWeight: 600 }}>
            iPermit
          </ThemedText>
          <ThemedText
            themeColor="onBrand"
            numberOfLines={2}
            style={{ fontSize: sz(10), lineHeight: sz(13), letterSpacing: 1, opacity: 0.85 }}
          >
            SRI LANKA · DRIVING LICENCE
          </ThemedText>
        </View>
        <View
          testID="license-status"
          accessible
          accessibilityLabel={isActive ? 'Active' : 'Suspended'}
          style={[styles.pill, { backgroundColor: isActive ? GLASS : WHITE }]}
        >
          {isActive ? (
            <View style={[styles.dot, { backgroundColor: '#5BE3A4' }]} />
          ) : (
            <Ionicons name="ban" size={sz(13)} color={SUSPENDED_RED} />
          )}
          <ThemedText
            style={{ fontSize: sz(12), lineHeight: sz(16), fontWeight: 600, color: isActive ? WHITE : SUSPENDED_RED }}
          >
            {isActive ? 'Active' : 'Suspended'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.bodyLeft}>
          <View style={styles.chipRow}>
            <LinearGradient
              colors={isActive ? CHIP_GOLD : CHIP_GREY}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.chip, { width: sz(46), height: sz(36), borderRadius: sz(7) }]}
            >
              <View style={[styles.chipInner, { width: sz(30), height: sz(22), borderRadius: sz(4) }]}>
                <View style={styles.chipLine} />
                <View style={styles.chipLine} />
              </View>
            </LinearGradient>
            {/* Contactless symbol: the wifi glyph turned on its side. */}
            <Ionicons name="wifi" size={sz(24)} color={WHITE} style={styles.contactless} />
          </View>
          <ThemedText
            selectable
            testID="license-number"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            themeColor="onBrand"
            style={[styles.number, { fontSize: sz(22), lineHeight: sz(28), letterSpacing: sz(1.5), marginTop: sz(8) }]}
          >
            {license.license_no}
          </ThemedText>
        </View>
        <View
          style={[styles.photo, { width: sz(56), height: sz(72), borderRadius: sz(8) }]}
          accessibilityLabel="Driver photo"
        >
          {photo ? (
            // No caching: the photo is behind the user's login, and a shared
            // device must never show the previous driver's face.
            <Image source={photo} style={styles.photoImage} contentFit="cover" contentPosition="top" cachePolicy="none" />
          ) : (
            <Ionicons name="person" size={sz(30)} color="#8A8F99" />
          )}
        </View>
      </View>

      <View style={styles.footer}>
        {nic ? (
          <View>
            <ThemedText themeColor="onBrand" style={[styles.label, { fontSize: sz(11), lineHeight: sz(14) }]}>
              NIC
            </ThemedText>
            <ThemedText themeColor="onBrand" style={{ fontSize: sz(14), lineHeight: sz(18), fontWeight: 600 }}>
              {nic}
            </ThemedText>
          </View>
        ) : null}
        <View>
          <ThemedText themeColor="onBrand" style={[styles.label, { fontSize: sz(11), lineHeight: sz(14) }]}>
            Expires
          </ThemedText>
          <ThemedText themeColor="onBrand" style={{ fontSize: sz(14), lineHeight: sz(18), fontWeight: 600 }}>
            {formatMonthYear(license.expiry_at)}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.flipSlot, { right: sz(14), bottom: sz(12) }]}>
        <FlipButton onPress={onFlip} label="Show vehicle categories" size={sz(32)} testID="license-flip" />
      </View>
    </LinearGradient>
  );
}

// The driver's registration photo for the card, or null while it loads or when
// there isn't one (the card then shows a silhouette). Reloaded per licence.
function useLicensePhoto(licenseId: string): PhotoSource | null {
  const [photo, setPhoto] = useState<PhotoSource | null>(null);

  useEffect(() => {
    let cancelled = false;
    let blobUrl: string | null = null;
    getLicensePhotoSource()
      .then((source) => {
        if (source?.uri.startsWith('blob:')) blobUrl = source.uri;
        if (!cancelled) setPhoto(source);
        else if (blobUrl) URL.revokeObjectURL(blobUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [licenseId]);

  return photo;
}

// The button under the card, and the sheet it opens: the QR an officer scans,
// shown large on its own so it scans reliably.
export function LicenseQrButton({ license }: { license: License }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const qrSize = Math.min(240, Math.max(180, width - 144));

  return (
    <>
      <Button variant="primary" onPress={() => setOpen(true)} testID="license-qr-toggle">
        <Ionicons name="qr-code-outline" size={20} color={theme.onPrimary} />
        <ThemedText type="smallBold" themeColor="onPrimary" style={styles.buttonText}>
          Show QR to officer
        </ThemedText>
      </Button>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close QR code"
        />
        <View
          style={[styles.sheet, { backgroundColor: theme.backgroundElement, paddingBottom: Math.max(insets.bottom, Spacing.three) + Spacing.three }]}
        >
          <View style={[styles.handle, { backgroundColor: theme.backgroundSelected }]} />
          <ThemedText type="subtitle" style={styles.centered} accessibilityRole="header">
            Show this to an officer
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
            {license.license_no} · {license.status === 'ACTIVE' ? 'Active' : 'Suspended'}
          </ThemedText>
          {/* White backing in both themes: QR scanners need dark-on-light contrast. */}
          <View style={styles.qrWrapper} testID="license-qr">
            <QRCode value={license.qr_token} size={qrSize} />
          </View>
          <Button variant="secondary" onPress={() => setOpen(false)} testID="license-qr-close" style={styles.fullWidth}>
            <ThemedText type="smallBold">Close</ThemedText>
          </Button>
        </View>
      </Modal>
    </>
  );
}

// Demerit points as their own card: ten segments filled to the current points,
// coloured by how close the licence is to suspension.
export function DemeritPointsCard({ license }: { license: License }) {
  const theme = useTheme();
  const suspended = license.status === 'SUSPENDED';
  const points = Math.min(Math.max(license.points, 0), SUSPENSION_POINTS);
  const color = theme[pointsColorKey(license.points)];
  const remaining = SUSPENSION_POINTS - points;

  return (
    <Card
      testID="points-card"
      style={[styles.pointsCard, suspended && { borderWidth: 1, borderColor: tint(theme.danger, 'strong') }]}
    >
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Demerit points, ${license.points} of ${SUSPENSION_POINTS}`}
        accessibilityValue={{ min: 0, max: SUSPENSION_POINTS, now: points }}
        style={styles.pointsTop}
      >
        <ThemedText type="smallBold" style={styles.pointsTitle}>
          Demerit points
        </ThemedText>
        <ThemedText testID="license-points" style={[styles.pointsCount, suspended && { color: theme.danger }]}>
          {license.points}
          <ThemedText themeColor="textSecondary" style={styles.pointsOf}>
            {' '}
            / {SUSPENSION_POINTS}
          </ThemedText>
        </ThemedText>
      </View>
      <View style={styles.segments} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: SUSPENSION_POINTS }, (_, i) => (
          <View
            key={i}
            style={[styles.segment, { backgroundColor: i < points ? color : theme.backgroundSelected }]}
          />
        ))}
      </View>
      {suspended ? (
        <View style={styles.suspendedNote}>
          <Ionicons name="alert-circle" size={18} color={theme.danger} />
          <ThemedText type="small" style={[styles.flex, { color: theme.danger }]}>
            Your licence is suspended. Pay your outstanding fines and contact the licensing office.
          </ThemedText>
        </View>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          {remaining} more {remaining === 1 ? 'point' : 'points'} until your licence is suspended
        </ThemedText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  // The frame the two faces turn inside.
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    aspectRatio: CARD_ASPECT,
    // Narrow phones: a little taller than ID-1 beats a cramped card.
    minHeight: 188,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
  },
  faceWrap: { position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0, backfaceVisibility: 'hidden' },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  flipSlot: { position: 'absolute' },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  brandText: { flex: 1, minWidth: 0 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 1,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  body: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three, paddingTop: Spacing.two },
  bodyLeft: { flex: 1, minWidth: 0, justifyContent: 'space-between' },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  chip: { alignItems: 'center', justifyContent: 'center' },
  chipInner: {
    borderWidth: 1,
    borderColor: 'rgba(90, 60, 0, 0.45)',
    justifyContent: 'space-evenly',
  },
  chipLine: { height: 1, backgroundColor: 'rgba(90, 60, 0, 0.35)' },
  contactless: { transform: [{ rotate: '90deg' }], opacity: 0.8 },
  // A soft dark shadow keeps the white number readable over the lighter end of the gradient.
  number: {
    fontFamily: Fonts.mono,
    fontWeight: 700,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  photo: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  photoImage: { width: '100%', height: '100%' },
  footer: { flexDirection: 'row', gap: Spacing.four + Spacing.half * 2, marginTop: Spacing.two },
  label: { textTransform: 'uppercase', letterSpacing: 0.8, opacity: 0.75 },
  buttonText: { fontSize: 15 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  sheet: {
    alignItems: 'center',
    gap: Spacing.two,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  handle: { width: 40, height: 4, borderRadius: 2, marginBottom: Spacing.two },
  qrWrapper: {
    padding: Spacing.three,
    marginVertical: Spacing.two,
    backgroundColor: WHITE,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
  },
  centered: { textAlign: 'center' },
  fullWidth: { alignSelf: 'stretch' },
  flex: { flex: 1 },
  pointsCard: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.medium },
  pointsTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  pointsTitle: { fontSize: 15 },
  pointsCount: { fontSize: 15, fontWeight: 600, fontVariant: ['tabular-nums'] },
  pointsOf: { fontSize: 15, fontWeight: 400 },
  segments: { flexDirection: 'row', gap: Spacing.one },
  segment: { flex: 1, height: 10, borderRadius: 3 },
  suspendedNote: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
});
