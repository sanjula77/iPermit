import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.card} testID={testID}>
      <View style={styles.headerRow}>
        <Ionicons name="person-circle-outline" size={20} color={theme.text} />
        <ThemedText type="smallBold" selectable>
          {driver.email}
        </ThemedText>
      </View>
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
          <View style={styles.statusRow}>
            <Ionicons
              name={driver.license_status === 'ACTIVE' ? 'checkmark-circle' : 'ban'}
              size={14}
              color={driver.license_status === 'ACTIVE' ? theme.primary : theme.danger}
            />
            <ThemedText
              type="smallBold"
              themeColor={driver.license_status === 'ACTIVE' ? 'primary' : 'danger'}
            >
              {driver.license_status} · {driver.points} pts
            </ThemedText>
          </View>
        </>
      ) : (
        <View style={styles.statusRow}>
          <Ionicons name="alert-circle-outline" size={14} color={theme.danger} />
          <ThemedText type="small" themeColor="danger">
            No license issued
          </ThemedText>
        </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
});
