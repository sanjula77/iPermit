import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Card({
  style,
  testID,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children: ReactNode;
}) {
  const theme = useTheme();

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, boxShadow: Shadows.card },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
