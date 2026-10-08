import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { Banner } from '@/components/banner';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { FadeInItem } from '@/components/fade-in-item';
import { HeroAction, HeroChip, HeroScreen } from '@/components/hero-screen';
import { IconTile } from '@/components/icon-tile';
import { ListRow } from '@/components/list-row';
import { ScreenState } from '@/components/screen-state';
import { Skeleton } from '@/components/skeleton';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { VIOLATION_COLOR, VIOLATION_ICON, violationTitle } from '@/constants/violations';
import { useMyFines } from '@/hooks/use-my-fines';
import { useTheme } from '@/hooks/use-theme';
import { appealForFine, fineBadge } from '@/lib/fine-status';
import { summarizeFines, type FineSummary } from '@/lib/fine-summary';
import { formatDate, formatDateShort, formatLkr } from '@/lib/format';
import type { Appeal, FineWithViolation } from '@/types/fine';

export default function FinesScreen() {
  const { fines, appeals, error, isLoading, reload } = useMyFines();
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();
  const summary = fines ? summarizeFines(fines, appeals) : null;

  async function handleRefresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  const openOldestPayable = () => {
    if (!summary?.oldestPayableId) return;
    router.push({ pathname: '/(app)/(tabs)/(fines)/fine/[id]', params: { id: summary.oldestPayableId } });
  };

  return (
    <HeroScreen
      title="Fines"
      testID="fines-screen"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.brand]} tintColor={theme.onBrand} />
      }
      heroContent={
        summary ? (
          <>
            <BalanceFigure amount={summary.outstanding} />
            <View style={styles.heroFooter}>
              {summary.unpaidCount ? (
                <HeroChip
                  icon="alert-circle"
                  label={`${summary.unpaidCount} unpaid ${summary.unpaidCount === 1 ? 'fine' : 'fines'}`}
                  testID="fines-unpaid-chip"
                />
              ) : (
                <HeroChip icon="checkmark-circle" label="All clear" testID="fines-all-clear" />
              )}
              {summary.oldestPayableId ? (
                <HeroAction
                  icon="card-outline"
                  label={summary.payableCount > 1 ? 'Pay oldest' : 'Pay fine'}
                  onPress={openOldestPayable}
                  testID="fines-hero-pay"
                />
              ) : null}
            </View>
          </>
        ) : error && !isLoading ? undefined : (
          // First load: placeholders; after a failed first load the hero stays
          // plain and the error with Retry shows below.
          <View style={styles.heroSkeleton}>
            <Skeleton width={140} height={14} style={styles.onHero} />
            <Skeleton width={200} height={36} style={styles.onHero} />
          </View>
        )
      }
    >
      {fines !== null && error ? (
        // Keep showing the last good data, but say the refresh failed.
        <Banner tone="danger" text={`Couldn't refresh: ${error}`} testID="fines-refresh-error" />
      ) : null}
      {fines === null ? (
        isLoading || !error ? (
          <FinesSkeleton />
        ) : (
          <ScreenState error={error} onRetry={handleRefresh} testID="fines" />
        )
      ) : fines.length === 0 ? (
        <EmptyState
          testID="fines-empty"
          icon="shield-checkmark-outline"
          title="No fines"
          message="You have no traffic fines. Keep driving safely."
        />
      ) : summary ? (
        <FinesContent fines={fines} appeals={appeals} summary={summary} />
      ) : null}
    </HeroScreen>
  );
}

// The balance as a designed figure: a spaced label, then a small "LKR" beside
// a large number. Split from formatLkr's output, so its formatting (grouping,
// the missing-amount dash) stays in one place. Read as one phrase.
function BalanceFigure({ amount }: { amount: number }) {
  const formatted = formatLkr(amount);
  const [currency, figure] = formatted.includes('\u00A0') ? formatted.split('\u00A0') : ['', formatted];

  return (
    <View
      style={styles.balance}
      testID="outstanding-total"
      accessible
      accessibilityLabel={`Outstanding balance ${formatted}`}
    >
      <ThemedText type="small" themeColor="onBrand" style={styles.eyebrow}>
        Outstanding balance
      </ThemedText>
      <View style={styles.amountRow}>
        {currency ? (
          <ThemedText type="subtitle" themeColor="onBrand" style={styles.currency}>
            {currency}
          </ThemedText>
        ) : null}
        <ThemedText
          type="display"
          themeColor="onBrand"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.4}
          style={styles.figure}
        >
          {figure}
        </ThemedText>
      </View>
    </View>
  );
}

function Stat({ label, value, testID }: { label: string; value: string; testID?: string }) {
  return (
    <View style={styles.stat} testID={testID} accessible accessibilityLabel={`${label}: ${value}`}>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {label}
      </ThemedText>
      <ThemedText
        type="smallBold"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        style={styles.statValue}
      >
        {value}
      </ThemedText>
    </View>
  );
}

function FinesSkeleton() {
  return (
    <View style={styles.skeleton} testID="fines-loading">
      <View style={styles.stats}>
        <Skeleton height={64} radius={Radius.medium} style={styles.flex} />
        <Skeleton height={64} radius={Radius.medium} style={styles.flex} />
      </View>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} height={72} radius={Radius.medium} />
      ))}
    </View>
  );
}

function FinesContent({
  fines,
  appeals,
  summary,
}: {
  fines: FineWithViolation[];
  appeals: Appeal[];
  summary: FineSummary;
}) {
  const theme = useTheme();
  const unpaid = fines.filter((f) => f.status === 'UNPAID');
  const history = fines.filter((f) => f.status !== 'UNPAID');

  return (
    <>
      {/* Both yearly figures in one slim card over the hero's edge. */}
      <Card variant="raised" style={[styles.statsCard, styles.overlap]}>
        <Stat label="Paid this year" value={formatLkr(summary.paidThisYear)} testID="fines-paid-this-year" />
        <View style={[styles.statDivider, { backgroundColor: theme.backgroundSelected }]} />
        <Stat label="Fines this year" value={String(summary.finesThisYear)} testID="fines-this-year" />
      </Card>

      <FineSection title="Unpaid" fines={unpaid} appeals={appeals} startIndex={0} />
      <FineSection title="History" fines={history} appeals={appeals} startIndex={unpaid.length} />
    </>
  );
}

function FineSection({
  title,
  fines,
  appeals,
  startIndex,
}: {
  title: string;
  fines: FineWithViolation[];
  appeals: Appeal[];
  startIndex: number;
}) {
  if (fines.length === 0) return null;

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel} accessibilityRole="header">
        {title}
      </ThemedText>
      {/* One card per fine, with space between them. */}
      {fines.map((fine, i) => (
        <FadeInItem key={fine.id} index={startIndex + i}>
          <Card style={styles.rowCard}>
            <FineRow fine={fine} appeal={appealForFine(appeals, fine.id)} />
          </Card>
        </FadeInItem>
      ))}
    </View>
  );
}

function FineRow({ fine, appeal }: { fine: FineWithViolation; appeal: Appeal | null }) {
  const theme = useTheme();
  const badge = fineBadge(fine, appeal);
  const label = violationTitle(fine.violation.type, fine.violation.description);
  const points = fine.violation.points_deducted;
  // In the Unpaid section a plain "Unpaid" badge only repeats the header;
  // keep the badge when it says something new (e.g. an appeal is pending).
  const showBadge = badge.label !== 'Unpaid';

  return (
    <ListRow
      testID={`fine-${fine.id}`}
      onPress={() => router.push({ pathname: '/(app)/(tabs)/(fines)/fine/[id]', params: { id: fine.id } })}
      accessibilityLabel={`${label}, ${formatLkr(fine.amount)}, ${formatDate(fine.violation.confirmed_at)}, ${points} demerit points, ${badge.label}`}
      leading={<IconTile icon={VIOLATION_ICON[fine.violation.type]} color={theme[VIOLATION_COLOR[fine.violation.type]]} />}
      title={label}
      value={formatLkr(fine.amount)}
      meta={`${formatDateShort(fine.violation.confirmed_at)} · ${points} pts`}
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
  balance: { gap: Spacing.half, alignSelf: 'stretch' },
  eyebrow: { opacity: 0.85 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  currency: { opacity: 0.85, fontWeight: 600 },
  figure: { flexShrink: 1, fontSize: 40, lineHeight: 46, letterSpacing: -0.5 },
  heroFooter: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  heroSkeleton: { gap: Spacing.two },
  // Skeleton blocks on the blue hero: white at low opacity instead of grey.
  onHero: { backgroundColor: 'rgba(255, 255, 255, 0.25)' },
  skeleton: { gap: Spacing.three },
  stats: { flexDirection: 'row', gap: Spacing.three },
  statsCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.three, paddingHorizontal: Spacing.four },
  stat: { flex: 1, minWidth: 0, gap: Spacing.half },
  statValue: { fontSize: 18, lineHeight: 24, fontVariant: ['tabular-nums'] },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginHorizontal: Spacing.three },
  // Lifts the first card over the hero's lower edge.
  overlap: { marginTop: -(Spacing.four + Spacing.three) },
  flex: { flex: 1 },
  rowCard: { paddingVertical: 0 },
  section: { gap: Spacing.two },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
