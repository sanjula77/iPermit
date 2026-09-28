import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Banner } from '@/components/banner';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ScreenState } from '@/components/screen-state';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ScreenScroll } from '@/components/screen-scroll';
import { Spacing } from '@/constants/theme';
import { VIOLATION_ICON, VIOLATION_LABEL } from '@/constants/violations';
import { useMyFines } from '@/hooks/use-my-fines';
import { useTheme } from '@/hooks/use-theme';
import { appealForFine, fineBadge } from '@/lib/fine-status';
import { formatDate, formatLkr } from '@/lib/format';
import type { Appeal, FineWithViolation } from '@/types/fine';

export default function FinesScreen() {
  const { fines, appeals, error, isLoading, reload } = useMyFines();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  return (
    <ScreenScroll
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {fines !== null && error ? (
        // Keep showing the last good data, but say the refresh failed.
        <Banner tone="danger" text={`Couldn't refresh: ${error}`} testID="fines-refresh-error" />
      ) : null}
      {fines === null ? (
        // Spinner while retrying replaces the stale error (and its Retry button).
        <ScreenState error={isLoading ? null : error} onRetry={handleRefresh} testID="fines" />
      ) : fines.length === 0 ? (
        <EmptyState
          testID="fines-empty"
          icon="shield-checkmark-outline"
          title="No fines"
          message="You have no traffic fines. Keep driving safely."
        />
      ) : (
        <FinesContent fines={fines} appeals={appeals} />
      )}
    </ScreenScroll>
  );
}

function FinesContent({ fines, appeals }: { fines: FineWithViolation[]; appeals: Appeal[] }) {
  const unpaid = fines.filter((f) => f.status === 'UNPAID');
  const history = fines.filter((f) => f.status !== 'UNPAID');
  const outstandingTotal = unpaid.reduce((sum, f) => sum + f.amount, 0);

  return (
    <>
      <Card style={styles.summary}>
        <ThemedText type="small" themeColor="textSecondary">
          Outstanding balance
        </ThemedText>
        <ThemedText
          type="title"
          themeColor={unpaid.length ? 'danger' : 'text'}
          testID="outstanding-total"
          style={styles.tabular}
        >
          {formatLkr(outstandingTotal)}
        </ThemedText>
        {unpaid.length ? (
          <ThemedText themeColor="textSecondary">
            {unpaid.length} unpaid {unpaid.length === 1 ? 'fine' : 'fines'}
          </ThemedText>
        ) : (
          <StatusBadge tone="success" icon="checkmark-circle" label="All clear" />
        )}
      </Card>

      <FineSection title="Unpaid" fines={unpaid} appeals={appeals} />
      <FineSection title="History" fines={history} appeals={appeals} />
    </>
  );
}

function FineSection({
  title,
  fines,
  appeals,
}: {
  title: string;
  fines: FineWithViolation[];
  appeals: Appeal[];
}) {
  const theme = useTheme();
  if (fines.length === 0) return null;

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
        {title}
      </ThemedText>
      <Card style={styles.list}>
        {fines.map((fine, i) => (
          <Fragment key={fine.id}>
            {i > 0 ? <View style={[styles.separator, { backgroundColor: theme.backgroundSelected }]} /> : null}
            <FineRow fine={fine} appeal={appealForFine(appeals, fine.id)} />
          </Fragment>
        ))}
      </Card>
    </View>
  );
}

function FineRow({ fine, appeal }: { fine: FineWithViolation; appeal: Appeal | null }) {
  const theme = useTheme();
  const badge = fineBadge(fine, appeal);
  const label = VIOLATION_LABEL[fine.violation.type];

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/(app)/(tabs)/(fines)/fine/[id]', params: { id: fine.id } })}
      testID={`fine-${fine.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${formatLkr(fine.amount)}, ${badge.label}`}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={[styles.iconCircle, { backgroundColor: theme.background }]}>
        <Ionicons name={VIOLATION_ICON[fine.violation.type]} size={20} color={theme.text} />
      </View>
      <View style={styles.rowText}>
        <ThemedText>{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatDate(fine.violation.confirmed_at)} · {fine.violation.points_deducted} pts
        </ThemedText>
      </View>
      <View style={styles.rowEnd}>
        <ThemedText type="smallBold" style={styles.tabular}>
          {formatLkr(fine.amount)}
        </ThemedText>
        <StatusBadge testID={`fine-status-${fine.id}`} tone={badge.tone} icon={badge.icon} label={badge.label} />
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  summary: {
    padding: Spacing.four,
    gap: Spacing.one,
  },
  tabular: { fontVariant: ['tabular-nums'] },
  section: { gap: Spacing.two },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    paddingVertical: 0,
    gap: 0,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  rowEnd: {
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
});
