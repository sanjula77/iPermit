import { useMemo, type ReactNode } from 'react';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

// Entrance for content the user is waiting on (a list's first load): fade up
// 250ms, staggered 40ms per item. Only the first 8 animate; later ones would
// arrive too late to read as one list. Reduce motion: appears in place.
const MAX_ANIMATED = 8;

export function FadeInItem({ index, children }: { index: number; children: ReactNode }) {
  const entering = useMemo(
    () =>
      index < MAX_ANIMATED
        ? FadeInDown.duration(250).delay(index * 40).reduceMotion(ReduceMotion.System)
        : undefined,
    [index],
  );
  return <Animated.View entering={entering}>{children}</Animated.View>;
}
