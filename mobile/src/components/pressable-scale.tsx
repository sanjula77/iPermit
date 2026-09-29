import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';

// Press feedback for buttons and tappable tiles: a 3% scale-down in 120ms on
// press-in (feedback), released on press-out. A CSS transition, not a shared
// value -- it's a two-state change. Full-width list rows don't use this; they
// keep an opacity highlight (a scaling row reads as the screen squishing).
// `style` is outer layout (margins, alignSelf); `contentStyle` is the visual.
export function PressableScale({
  style,
  contentStyle,
  children,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const [pressed, setPressed] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      pressRetentionOffset={16}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      style={style}
    >
      <Animated.View
        style={[
          PRESS_TRANSITION,
          reduceMotion ? styles.instant : null,
          contentStyle,
          pressed && !disabled && styles.pressed,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

// Outside StyleSheet.create: RN's style types don't know Reanimated's
// cubicBezier easing, but Animated.View's style prop does.
const PRESS_TRANSITION = {
  transform: [{ scale: 1 }],
  transitionProperty: 'transform',
  transitionDuration: 120,
  transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
} as const;

const styles = StyleSheet.create({
  // Reduce motion: the state still changes, just without the tween.
  instant: { transitionDuration: 0 },
  pressed: { transform: [{ scale: 0.97 }] },
});
