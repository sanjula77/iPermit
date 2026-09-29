import { type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const PULSE = {
  from: { opacity: 1 },
  to: { opacity: 0.45 },
};

// A placeholder block shaped like the content it stands in for, pulsing gently
// while the first load runs. Static under reduce motion.
export function Skeleton({
  width = '100%',
  height,
  radius = Radius.small,
  style,
}: {
  width?: DimensionValue;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: radius, backgroundColor: theme.backgroundSelected },
        reduceMotion
          ? null
          : {
              animationName: PULSE,
              animationDuration: 900,
              animationIterationCount: 'infinite',
              animationDirection: 'alternate',
              animationTimingFunction: 'ease-in-out',
            },
        style,
      ]}
    />
  );
}
