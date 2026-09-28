import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { Banner } from '@/components/banner';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { IconTile } from '@/components/icon-tile';
import { ListRow } from '@/components/list-row';
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
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
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
  if (fines.length === 0) return null;

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel} accessibilityRole="header">
        {title}
      </ThemedText>
      {/* One card per fine, with space between them. */}
      {fines.map((fine) => (
        <Card key={fine.id} style={styles.rowCard}>
          <FineRow fine={fine} appeal={appealForFine(appeals, fine.id)} />
        </Card>
      ))}
    </View>
  );
}

function FineRow({ fine, appeal }: { fine: FineWithViolation; appeal: Appeal | null }) {
  const theme = useTheme();
  const badge = fineBadge(fine, appeal);
  const label = VIOLATION_LABEL[fine.violation.type];
  const points = fine.violation.points_deducted;
  // In the Unpaid section a plain "Unpaid" badge only repeats the header;
  // keep the badge when it says something new (e.g. an appeal is pending).
  const showBadge = badge.label !== 'Unpaid';

  return (
    <ListRow
      testID={`fine-${fine.id}`}
      onPress={() => router.push({ pathname: '/(app)/(tabs)/(fines)/fine/[id]', params: { id: fine.id } })}
      accessibilityLabel={`${label}, ${formatLkr(fine.amount)}, ${formatDate(fine.violation.confirmed_at)}, ${points} demerit points, ${badge.label}`}
      leading={<IconTile icon={VIOLATION_ICON[fine.violation.type]} color={theme.text} />}
      title={label}
      value={formatLkr(fine.amount)}
      meta={`${formatDate(fine.violation.confirmed_at)} · ${points} pts`}
      badge={
        showBadge ? (
          <StatusBadge testID={`fine-status-${fine.id}`} tone={badge.tone} icon={badge.icon} label={badge.label} />
        ) : null
      }
      chevron
    />
  );
}

const styles = StyleSheet.create({
  summary: {
    padding: Spacing.four,
    gap: Spacing.one,
  },
  tabular: { fontVariant: ['tabular-nums'] },
  rowCard: { paddingVertical: 0 },
  section: { gap: Spacing.two },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
