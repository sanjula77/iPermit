import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Fragment, useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { ApiError, extractErrorMessage } from '@/api/client';
import { getMyBehaviour } from '@/api/behaviour';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { IconTile } from '@/components/icon-tile';
import { ListRow, ListSeparator } from '@/components/list-row';
import { ProgressBar } from '@/components/progress-bar';
import { ScreenScroll } from '@/components/screen-scroll';
import { ScreenState } from '@/components/screen-state';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { RISK_INFO, TREND_INFO } from '@/constants/behaviour';
import { Spacing } from '@/constants/theme';
import { VIOLATION_COLOR, VIOLATION_ICON, VIOLATION_LABEL } from '@/constants/violations';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, formatDateShort } from '@/lib/format';
import { pointsColorKey } from '@/lib/points';
import type { Behaviour } from '@/types/behaviour';
import type { FineStatus } from '@/types/fine';

const FINE_STATUS: Record<FineStatus, string> = { UNPAID: 'Unpaid', PAID: 'Paid', REVERSED: 'Reversed' };

function projectionText(b: Behaviour): string {
  if (b.projected_days_to_suspension !== null) {
    return `At the pace of the last ${90} days you would reach the ${b.suspension_threshold}-point limit in about ${b.projected_days_to_suspension} days.`;
  }
  if (b.recent_points === 0) return 'No violations in the last 90 days, so there is nothing to project.';
  return 'Your licence is already at the points limit.';
}

export default function BehaviourScreen() {
  const theme = useTheme();
  const [behaviour, setBehaviour] = useState<Behaviour | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setBehaviour(await getMyBehaviour());
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setBehaviour(null);
        setError(null);
      } else {
        setError(extractErrorMessage(err));
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (behaviour === null) {
    return (
      <ScreenScroll>
        <EmptyState
          icon="analytics-outline"
          title="No behaviour data yet"
          message="Your behaviour outlook appears once your digital licence is issued."
          testID="behaviour-empty"
        />
      </ScreenScroll>
    );
  }

  if (behaviour === undefined) {
    return <ScreenState error={error} onRetry={load} testID="behaviour" />;
  }

  const risk = RISK_INFO[behaviour.risk_level];
  const trend = TREND_INFO[behaviour.trend];
  const pointsColor = theme[pointsColorKey(behaviour.current_points)];

  return (
    <ScreenScroll
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.brand]} />}
    >
      <Card variant="raised" style={styles.card} testID="behaviour-summary">
        <StatusBadge label={risk.label} icon={risk.icon} tone={risk.tone} testID="behaviour-risk" />
        <ThemedText type="subtitle">Your risk outlook</ThemedText>
        {behaviour.reasons.map((reason) => (
          <View key={reason} style={styles.reason}>
            <Ionicons name="ellipse" size={6} color={theme.textSecondary} style={styles.bullet} />
            <ThemedText themeColor="textSecondary" style={styles.reasonText}>
              {reason}
            </ThemedText>
          </View>
        ))}
      </Card>

      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <ThemedText type="smallBold">Points</ThemedText>
          <ThemedText type="smallBold" style={styles.tabular} testID="behaviour-points">
            {behaviour.current_points} / {behaviour.suspension_threshold}
          </ThemedText>
        </View>
        <ProgressBar value={behaviour.current_points} max={behaviour.suspension_threshold} color={pointsColor} />
        <ThemedText type="small" themeColor="textSecondary">
          {behaviour.window_points} point{behaviour.window_points === 1 ? '' : 's'} from {behaviour.window_violations}{' '}
          violation{behaviour.window_violations === 1 ? '' : 's'} in the last 24 months.
          {behaviour.oldest_leaves_window_at
            ? ` Your oldest one leaves this window on ${formatDate(behaviour.oldest_leaves_window_at)}.`
            : ''}
        </ThemedText>
      </Card>

      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <ThemedText type="smallBold">Trend</ThemedText>
          <StatusBadge label={trend.label} icon={trend.icon} tone={trend.tone} testID="behaviour-trend" />
        </View>
        {behaviour.trend !== 'NOT_ENOUGH_DATA' ? (
          <ThemedText type="small" themeColor="textSecondary">
            {behaviour.recent_points} points in the last 90 days, compared with {behaviour.previous_points} in the 90 days before.
          </ThemedText>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            A trend needs at least 2 violations in the last 24 months.
          </ThemedText>
        )}
        <ThemedText type="small" themeColor="textSecondary" testID="behaviour-projection">
          {projectionText(behaviour)}
        </ThemedText>
      </Card>

      <View style={styles.section}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel} accessibilityRole="header">
          Recent violations
        </ThemedText>
        {behaviour.timeline.length === 0 ? (
          <Card style={styles.card}>
            <ThemedText themeColor="textSecondary" testID="behaviour-timeline-empty">
              No violations on record.
            </ThemedText>
          </Card>
        ) : (
          <Card style={styles.listCard} testID="behaviour-timeline">
            {behaviour.timeline.map((item, i) => (
              <Fragment key={`${item.confirmed_at}-${i}`}>
                {i > 0 ? <ListSeparator /> : null}
                <ListRow
                  leading={<IconTile icon={VIOLATION_ICON[item.type]} color={theme[VIOLATION_COLOR[item.type]]} />}
                  title={VIOLATION_LABEL[item.type]}
                  value={`${item.points} pts`}
                  meta={formatDateShort(item.confirmed_at)}
                  badge={
                    item.fine_status ? (
                      <StatusBadge
                        label={FINE_STATUS[item.fine_status]}
                        icon={item.fine_status === 'PAID' ? 'checkmark-circle' : 'time-outline'}
                        tone={item.fine_status === 'PAID' ? 'success' : 'warning'}
                      />
                    ) : undefined
                  }
                />
              </Fragment>
            ))}
          </Card>
        )}
      </View>

      <Card style={styles.card} testID="behaviour-tips">
        <ThemedText type="smallBold">What you can do</ThemedText>
        {behaviour.tips.map((tip) => (
          <ThemedText key={tip} themeColor="textSecondary">
            {tip}
          </ThemedText>
        ))}
      </Card>

      <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
        This outlook is worked out from your own violation history using fixed rules. It is indicative only and is not a
        prediction of what you will do.
      </ThemedText>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two },
  listCard: { paddingVertical: 0 },
  reason: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  bullet: { marginTop: 8 },
  reasonText: { flex: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  tabular: { fontVariant: ['tabular-nums'] },
  section: { gap: Spacing.two },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.5 },
  note: { textAlign: 'center' },
});
