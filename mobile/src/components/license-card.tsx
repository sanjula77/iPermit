import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Badge, BadgeTier } from '@/types/badge';
import type { License } from '@/types/license';

// AT_RISK and SUSPENDED intentionally share "danger" -- both are genuinely
// bad standing -- but each gets a distinct icon below so they never rely on
// color alone to be told apart.
const TIER_COLOR: Record<BadgeTier, 'success' | 'primary' | 'textSecondary' | 'warning' | 'danger'> = {
  PLATINUM: 'success',
  GOLD: 'primary',
  SILVER: 'textSecondary',
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

export function LicenseCard({ license, badge }: { license: License; badge?: Badge | null }) {
  const theme = useTheme();
  const expiry = new Date(license.expiry_at);

  return (
    <ThemedView type="backgroundElement" style={styles.card} testID="license-card">
      <View style={styles.details}>
        <ThemedText type="smallBold">Digital License</ThemedText>
        <ThemedText selectable testID="license-number">
          {license.license_no}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Expires {expiry.toLocaleDateString()}
        </ThemedText>
        <ThemedText
          type="smallBold"
          themeColor={license.status === 'ACTIVE' ? 'primary' : 'danger'}
          testID="license-status"
        >
          {license.status}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" testID="license-points">
          {license.points} demerit points
        </ThemedText>
        {badge ? (
          <View style={styles.badgeRow} testID="license-badge">
            <Ionicons name={TIER_ICON[badge.tier]} size={14} color={theme[TIER_COLOR[badge.tier]]} />
            <ThemedText type="small" themeColor={TIER_COLOR[badge.tier]}>
              Your Standing: {badge.tier.replace('_', ' ')} ({badge.safety_score})
            </ThemedText>
          </View>
        ) : null}
      </View>
      <View style={styles.qrWrapper} testID="license-qr">
        <QRCode value={license.qr_token} size={120} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    flexWrap: 'wrap',
  },
  details: {
    flex: 1,
    minWidth: 160,
    gap: Spacing.half,
  },
  qrWrapper: {
    padding: Spacing.two,
    backgroundColor: '#ffffff',
    borderRadius: Spacing.two,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
});
