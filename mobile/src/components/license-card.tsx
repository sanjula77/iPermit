import QRCode from 'react-native-qrcode-svg';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { License } from '@/types/license';

export function LicenseCard({ license }: { license: License }) {
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
