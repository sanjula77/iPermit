import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { ProgressBar } from '@/components/progress-bar';
import { StatusBadge, type StatusTone } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/button';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/format';
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

// The driver's digital licence, styled like a card: issuer line and status,
// the licence number, NIC and expiry, the demerit meter, and the QR an officer
// scans (revealed on demand so the card stays compact).
export function LicenseCard({ license, nic }: { license: License; nic?: string }) {
  const theme = useTheme();
  const [showQr, setShowQr] = useState(false);
  const isActive = license.status === 'ACTIVE';
  const pointsColor = theme[pointsColorKey(license.points)];

  return (
    <Card variant="raised" testID="license-card" style={styles.card}>
      <View style={styles.headerRow}>
        <ThemedText type="smallBold" themeColor="brand" style={styles.issuer} numberOfLines={1}>
          SRI LANKA · DRIVING LICENSE
        </ThemedText>
        <StatusBadge
          testID="license-status"
          tone={isActive ? 'success' : 'danger'}
          icon={isActive ? 'checkmark-circle' : 'ban'}
          label={isActive ? 'Active' : 'Suspended'}
        />
      </View>

      <View style={styles.numberBlock}>
        <ThemedText
          type="subtitle"
          selectable
          testID="license-number"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={styles.number}
        >
          {license.license_no}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {nic ? `NIC ${nic} · ` : ''}Expires {formatDate(license.expiry_at)}
        </ThemedText>
      </View>

      <View
        style={styles.statBlock}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Demerit points, ${license.points} of ${SUSPENSION_POINTS}`}
        accessibilityValue={{ min: 0, max: SUSPENSION_POINTS, now: Math.min(license.points, SUSPENSION_POINTS) }}
      >
        <ProgressBar value={license.points} max={SUSPENSION_POINTS} color={pointsColor} />
        <View style={styles.statRow}>
          <ThemedText type="small" themeColor="textSecondary">
            Demerit points
          </ThemedText>
          <ThemedText type="smallBold" testID="license-points" style={styles.tabular}>
            {license.points} / {SUSPENSION_POINTS}
          </ThemedText>
        </View>
      </View>

      {showQr ? (
        <View style={styles.qrBlock}>
          {/* White backing in both themes: QR scanners need dark-on-light contrast. */}
          <View style={styles.qrWrapper} testID="license-qr">
            <QRCode value={license.qr_token} size={200} />
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
            Show this code to an officer to verify your license
          </ThemedText>
        </View>
      ) : null}

      <Button
        variant={showQr ? 'ghost' : 'primary'}
        onPress={() => setShowQr((v) => !v)}
        testID="license-qr-toggle"
      >
        <Ionicons name={showQr ? 'chevron-up' : 'qr-code-outline'} size={18} color={showQr ? theme.primary : theme.onPrimary} />
        <ThemedText type="smallBold" themeColor={showQr ? 'primary' : 'onPrimary'}>
          {showQr ? 'Hide QR code' : 'Show QR to officer'}
        </ThemedText>
      </Button>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    gap: Spacing.three,
    borderRadius: Radius.large,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  issuer: { flexShrink: 1, letterSpacing: 0.6, fontSize: 12 },
  numberBlock: { gap: Spacing.half },
  number: { letterSpacing: 0.5, fontVariant: ['tabular-nums'] },
  qrBlock: { alignItems: 'center', gap: Spacing.two },
  qrWrapper: {
    padding: Spacing.three,
    backgroundColor: '#ffffff',
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
  },
  centered: { textAlign: 'center' },
  statBlock: { gap: Spacing.one },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabular: { fontVariant: ['tabular-nums'] },
});
