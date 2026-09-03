import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { DriverSummary } from '@/types/police';

export function DriverSummaryCard({
  driver,
  similarity,
  testID,
}: {
  driver: DriverSummary;
  similarity?: number;
  testID?: string;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.card} testID={testID}>
      <ThemedText type="smallBold" selectable>
        {driver.email}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" selectable>
        NIC: {driver.nic}
      </ThemedText>
      {typeof similarity === 'number' ? (
        <ThemedText type="small" themeColor="textSecondary">
          Match confidence: {(similarity * 100).toFixed(1)}%
        </ThemedText>
      ) : null}
      {driver.license_no ? (
        <>
          <ThemedText type="small" selectable>
            License: {driver.license_no}
          </ThemedText>
          <ThemedText
            type="smallBold"
            themeColor={driver.license_status === 'ACTIVE' ? 'primary' : 'danger'}
          >
            {driver.license_status} · {driver.points} pts
          </ThemedText>
        </>
      ) : (
        <ThemedText type="small" themeColor="danger">
          No license issued
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
});
