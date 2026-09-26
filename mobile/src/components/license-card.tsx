import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { StatusBadge, type StatusTone } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Badge, BadgeTier } from '@/types/badge';
import type { License } from '@/types/license';

// Mirrors the backend's SUSPENSION_POINTS_THRESHOLD (violation_service.py):
// the license is suspended once cumulative demerit points reach this value.
const SUSPENSION_POINTS = 10;

// AT_RISK and SUSPENDED intentionally share "danger" -- both are genuinely
// bad standing -- but each gets a distinct icon below so they never rely on
// color alone to be told apart.
const TIER_TONE: Record<BadgeTier, StatusTone> = {
  PLATINUM: 'success',
  GOLD: 'info',
  SILVER: 'neutral',
  BRONZE: 'warning',
  AT_RISK: 'danger',
  SUSPENDED: 'danger',
};

const TIER_ICON: Record<BadgeTier, keyof typeof Ionicons.glyphMap> = {
  PLATINUM: 'star',
  GOLD: 'medal',
  SILVER: 'medal-outline',
  BRONZE: 'shield-half-outline',
  AT_RISK: 'warning',
  SUSPENDED: 'ban',
};

const TIER_LABEL: Record<BadgeTier, string> = {
  PLATINUM: 'Platinum',
  GOLD: 'Gold',
  SILVER: 'Silver',
  BRONZE: 'Bronze',
  AT_RISK: 'At risk',
  SUSPENDED: 'Suspended',
};

// Bar color as points approach the suspension threshold. These names are
// both status tones and theme color keys.
function pointsColorKey(points: number): 'success' | 'warning' | 'danger' {
  if (points >= 8) return 'danger';
  if (points >= 5) return 'warning';
  return 'success';
}

export function LicenseCard({ license, badge }: { license: License; badge?: Badge | null }) {
  const theme = useTheme();
  const isActive = license.status === 'ACTIVE';
  const pointsColor = theme[pointsColorKey(license.points)];
  const pointsFill = `${Math.min(license.points / SUSPENSION_POINTS, 1) * 100}%` as const;

  return (
    <Card testID="license-card" style={styles.card}>
      <View style={styles.headerRow}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Driving License
        </ThemedText>
        <StatusBadge
          testID="license-status"
          tone={isActive ? 'success' : 'danger'}
          icon={isActive ? 'checkmark-circle' : 'ban'}
          label={isActive ? 'Active' : 'Suspended'}
        />
      </View>

      <View style={styles.numberBlock}>
        <ThemedText type="subtitle" selectable testID="license-number">
          {license.license_no}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Expires {new Date(license.expiry_at).toLocaleDateString()}
        </ThemedText>
      </View>

      <View style={styles.qrBlock}>
        {/* White backing in both themes: QR scanners need dark-on-light contrast. */}
        <View style={styles.qrWrapper} testID="license-qr">
          <QRCode value={license.qr_token} size={200} />
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
          Show this code to an officer to verify your license
        </ThemedText>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />

      <View
        style={styles.statBlock}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Demerit points, ${license.points} of ${SUSPENSION_POINTS}`}
        accessibilityValue={{ min: 0, max: SUSPENSION_POINTS, now: Math.min(license.points, SUSPENSION_POINTS) }}
      >
        <View style={styles.statRow}>
          <ThemedText type="small" themeColor="textSecondary">
            Demerit points
          </ThemedText>
          <ThemedText type="smallBold" testID="license-points" style={styles.tabular}>
            {license.points} / {SUSPENSION_POINTS}
          </ThemedText>
        </View>
        <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
          <View style={[styles.fill, { width: pointsFill, backgroundColor: pointsColor }]} />
        </View>
      </View>

      {badge ? (
        <View style={styles.statRow}>
          <ThemedText type="small" themeColor="textSecondary">
            Standing
          </ThemedText>
          <StatusBadge
            testID="license-badge"
            tone={TIER_TONE[badge.tier]}
            icon={TIER_ICON[badge.tier]}
            label={`${TIER_LABEL[badge.tier]} · ${badge.safety_score}`}
          />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  numberBlock: {
    gap: Spacing.half,
  },
  qrBlock: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  qrWrapper: {
    padding: Spacing.three,
    backgroundColor: '#ffffff',
    borderRadius: Spacing.three,
    borderCurve: 'continuous',
  },
  centered: { textAlign: 'center' },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  statBlock: {
    gap: Spacing.two,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabular: { fontVariant: ['tabular-nums'] },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
