import { StyleSheet, View, type ColorValue } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

// A thin track + fill. Callers own the accessibility semantics (label/value),
// since only they know what the bar measures.
export function ProgressBar({ value, max, color }: { value: number; max: number; color?: ColorValue }) {
  const theme = useTheme();
  const fill = `${Math.min(Math.max(value / max, 0), 1) * 100}%` as const;

  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
      <View style={[styles.fill, { width: fill, backgroundColor: color ?? theme.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
