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
import { ScreenScroll } from '@/components/screen-scroll';
import { ScreenState } from '@/components/screen-state';
import { StatTile } from '@/components/stat-tile';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { RISK_COLOR, RISK_INFO, TREND_INFO } from '@/constants/behaviour';
import { Spacing } from '@/constants/theme';
import { VIOLATION_COLOR, VIOLATION_ICON, violationTitle } from '@/constants/violations';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, formatDateShort } from '@/lib/format';
import { pointsColorKey } from '@/lib/points';
import type { Behaviour } from '@/types/behaviour';
import type { FineStatus } from '@/types/fine';

const FINE_STATUS: Record<FineStatus, string> = { UNPAID: 'Unpaid', PAID: 'Paid', REVERSED: 'Reversed' };

// One line on where the current pace leads; shown with an icon, warning-coloured
// only when there is a real projection.
function outlookLine(b: Behaviour): { text: string; warn: boolean } {
  if (b.projected_days_to_suspension !== null) {
    return {
      text: `At this pace you would reach the ${b.suspension_threshold}-point limit in about ${b.projected_days_to_suspension} days.`,
      warn: true,
    };
  }
  if (b.recent_points === 0) return { text: 'No violations in the last 90 days.', warn: false };
  return { text: 'Your licence is at the points limit.', warn: true };
}

const MAX_TIMELINE = 5;
const MAX_TIPS = 3;
const MAX_REASONS = 3;

export default function BehaviourScreen() {
  const theme = useTheme();
  const [behaviour, setBehaviour] = useState<Behaviour | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Fixed for the life of the screen: which violations have already expired.
  const [now] = useState(() => Date.now());

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
  const riskColor = theme[RISK_COLOR[behaviour.risk_level]];
  const trend = TREND_INFO[behaviour.trend];
  const pointsColor = pointsColorKey(behaviour.current_points);
  const outlook = outlookLine(behaviour);
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  // Points count for a fixed time from each violation; the 24-month totals also
  // include older violations that have stopped counting.
  const validMonths = Math.round(behaviour.points_validity_days / 30);
  const windowNote =
    behaviour.window_points > behaviour.current_points
      ? `Points count for ${validMonths} months from each violation. The 24-month total also includes older ones that no longer count.`
      : `Points count for ${validMonths} months from each violation.`;

  return (
    <ScreenScroll
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.brand]} />}
    >
      <Card variant="raised" style={styles.summary} testID="behaviour-summary">
        <View style={styles.summaryTop}>
          <IconTile icon={risk.icon} color={riskColor} size={52} />
          <View style={styles.flex}>
            <ThemedText type="subtitle" style={{ color: riskColor }} testID="behaviour-risk">
              {risk.label}
            </ThemedText>
            <View style={styles.trendRow} testID="behaviour-trend">
              <Ionicons name={trend.icon} size={16} color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary">
                {trend.label}
              </ThemedText>
            </View>
          </View>
        </View>
        <View style={[styles.rule, { backgroundColor: theme.backgroundSelected }]} />
        <ThemedText type="smallBold">Why</ThemedText>
        {behaviour.reasons.slice(0, MAX_REASONS).map((reason) => (
          <View key={reason} style={styles.reason}>
            <Ionicons name="ellipse" size={5} color={theme.textSecondary} style={styles.bullet} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
              {reason}
            </ThemedText>
          </View>
        ))}
      </Card>

      <View style={styles.tiles}>
        <StatTile
          compact
          variant="flat"
          label="Points now"
          value={`${behaviour.current_points} / ${behaviour.suspension_threshold}`}
          sub="current"
          valueColor={pointsColor}
          testID="behaviour-points"
        />
        <StatTile
          compact
          variant="flat"
          label="90 days"
          value={`${behaviour.recent_points} pts`}
          sub={plural(behaviour.recent_violations, 'violation')}
        />
        <StatTile
          compact
          variant="flat"
          label="24 months"
          value={`${behaviour.window_points} pts`}
          sub={plural(behaviour.window_violations, 'violation')}
        />
      </View>
      {windowNote ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.caption}>
          {windowNote}
        </ThemedText>
      ) : null}

      <Card style={styles.outlook} testID="behaviour-projection">
        <Ionicons
          name={outlook.warn ? 'alert-circle' : 'checkmark-circle'}
          size={22}
          color={outlook.warn ? theme.warning : theme.success}
        />
        <ThemedText type="small" style={styles.flex}>
          {outlook.text}
        </ThemedText>
      </Card>

      <View style={styles.section}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel} accessibilityRole="header">
          Recent violations
        </ThemedText>
        {behaviour.timeline.length === 0 ? (
          <Card style={styles.outlook}>
            <ThemedText type="small" themeColor="textSecondary" testID="behaviour-timeline-empty">
              No violations on record.
            </ThemedText>
          </Card>
        ) : (
          <Card style={styles.listCard} testID="behaviour-timeline">
            {behaviour.timeline.slice(0, MAX_TIMELINE).map((item, i) => (
              <Fragment key={`${item.confirmed_at}-${i}`}>
                {i > 0 ? <ListSeparator /> : null}
                <ListRow
                  leading={<IconTile icon={VIOLATION_ICON[item.type]} color={theme[VIOLATION_COLOR[item.type]]} />}
                  title={violationTitle(item.type, item.description)}
                  value={`${item.points} pts`}
                  meta={`${formatDateShort(item.confirmed_at)} · ${
                    Date.parse(item.points_expire_at) <= now ? 'expired' : `expires ${formatDate(item.points_expire_at)}`
                  }`}
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

      {behaviour.tips.length > 0 ? (
        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel} accessibilityRole="header">
            What you can do
          </ThemedText>
          <Card style={styles.tips} testID="behaviour-tips">
            {behaviour.tips.slice(0, MAX_TIPS).map((tip) => (
              <View key={tip} style={styles.reason}>
                <Ionicons name="checkmark-circle-outline" size={18} color={theme.primary} style={styles.tipIcon} />
                <ThemedText type="small" style={styles.flex}>
                  {tip}
                </ThemedText>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
        Worked out from your own violation history using fixed rules. Indicative only, not a prediction of what you will
        do.
      </ThemedText>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  summary: { gap: Spacing.two, padding: Spacing.four },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + 2, marginTop: 2 },
  rule: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.one },
  reason: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  bullet: { marginTop: 8 },
  tipIcon: { marginTop: 1 },
  tiles: { flexDirection: 'row', gap: Spacing.two },
  caption: { marginTop: -Spacing.one },
  outlook: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three },
  listCard: { paddingVertical: 0 },
  tips: { gap: Spacing.two, padding: Spacing.three },
  section: { gap: Spacing.two },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.5 },
  note: { textAlign: 'center' },
});
