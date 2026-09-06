import QRCode from 'react-native-qrcode-svg';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Badge, BadgeTier } from '@/types/badge';
import type { License } from '@/types/license';

const TIER_COLOR: Record<BadgeTier, 'primary' | 'danger' | 'textSecondary'> = {
  PLATINUM: 'primary',
  GOLD: 'primary',
  SILVER: 'textSecondary',
  BRONZE: 'textSecondary',
  AT_RISK: 'danger',
  SUSPENDED: 'danger',
};

export function LicenseCard({ license, badge }: { license: License; badge?: Badge | null }) {
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
          <ThemedText type="small" themeColor={TIER_COLOR[badge.tier]} testID="license-badge">
            Your Standing: {badge.tier.replace('_', ' ')} ({badge.safety_score})
          </ThemedText>
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
});
