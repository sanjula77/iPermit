import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { IconTile } from '@/components/icon-tile';
import { ListRow } from '@/components/list-row';
import { StatusBadge } from '@/components/status-badge';
import { RISK_INFO, TREND_INFO } from '@/constants/behaviour';
import { Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Behaviour } from '@/types/behaviour';

const RISK_COLOR: Record<Behaviour['risk_level'], ThemeColor> = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'success',
};

// Home summary of the driver's behaviour outlook; opens the detail screen.
export function BehaviourCard({ behaviour }: { behaviour: Behaviour }) {
  const theme = useTheme();
  const risk = RISK_INFO[behaviour.risk_level];
  const trend = TREND_INFO[behaviour.trend];

  return (
    <Card style={styles.card} testID="home-behaviour">
      <ListRow
        onPress={() => router.push('/(app)/behaviour')}
        accessibilityLabel={`My behaviour: ${risk.label}. ${behaviour.reasons[0] ?? ''}`}
        accessibilityHint="Opens your behaviour details"
        leading={<IconTile icon="analytics-outline" color={theme[RISK_COLOR[behaviour.risk_level]]} />}
        title="My behaviour"
        meta={behaviour.reasons[0]}
        badge={<StatusBadge label={risk.label} icon={risk.icon} tone={risk.tone} testID="home-behaviour-risk" />}
        chevron
      />
      {behaviour.trend !== 'NOT_ENOUGH_DATA' ? (
        <View style={styles.trend}>
          <StatusBadge label={trend.label} icon={trend.icon} tone={trend.tone} />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 0 },
  trend: { flexDirection: 'row', alignItems: 'center', paddingBottom: Spacing.three },
});
