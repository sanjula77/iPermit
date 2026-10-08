import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { IconTile } from '@/components/icon-tile';
import { ThemedText } from '@/components/themed-text';
import { RISK_COLOR, RISK_INFO, TREND_INFO } from '@/constants/behaviour';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Behaviour } from '@/types/behaviour';

// Home summary of the driver's behaviour outlook: one two-line row, the risk
// level in its colour and, when there is enough history, which way it is going.
// Opens the detail screen.
export function BehaviourCard({ behaviour }: { behaviour: Behaviour }) {
  const theme = useTheme();
  const risk = RISK_INFO[behaviour.risk_level];
  const color = theme[RISK_COLOR[behaviour.risk_level]];
  const trend = behaviour.trend === 'NOT_ENOUGH_DATA' ? null : TREND_INFO[behaviour.trend];

  return (
    <Card style={styles.card} testID="home-behaviour">
      <Pressable
        onPress={() => router.push('/(app)/behaviour')}
        accessibilityRole="button"
        accessibilityLabel={`My behaviour: ${risk.label}${trend ? `, ${trend.label}` : ''}`}
        accessibilityHint="Opens your behaviour details"
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
      >
        <IconTile icon="analytics-outline" color={color} />
        <View style={styles.text}>
          <ThemedText type="smallBold" style={styles.title}>
            My behaviour
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            <ThemedText type="smallBold" style={{ color }} testID="home-behaviour-risk">
              {risk.label}
            </ThemedText>
            {trend ? ` · ${trend.label}` : ''}
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  text: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, lineHeight: 22 },
});
