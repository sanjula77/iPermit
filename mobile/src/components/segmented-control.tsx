import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, tint } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const PAD = Spacing.half;
const GAP = Spacing.half;

// The selection indicator slides between segments (state indication). Outside
// StyleSheet.create: RN's style types don't know Reanimated's cubicBezier.
const SLIDE = {
  transitionProperty: 'transform',
  transitionDuration: 200,
  transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
} as const;

// A row of mutually exclusive options (Material "segmented button" / iOS
// segmented control): one selected at a time, all visible at once.
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  testID,
}: {
  options: { label: string; value: T; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  // Equal-width segments: the container's inner width (inside the hairline
  // border and padding) shared out, minus gaps.
  const inner = width - StyleSheet.hairlineWidth * 2 - PAD * 2;
  const segmentWidth = width > 0 ? (inner - GAP * (options.length - 1)) / options.length : 0;

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundElement,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.backgroundSelected,
        },
      ]}
      accessibilityRole="radiogroup"
      testID={testID}
    >
      {segmentWidth > 0 ? (
        // Absolutely positioned and childless, so moving it re-lays-out nothing.
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            SLIDE,
            reduceMotion ? styles.instant : null,
            {
              width: segmentWidth,
              backgroundColor: tint(theme.primary),
              transform: [{ translateX: selectedIndex * (segmentWidth + GAP) }],
            },
          ]}
        />
      ) : null}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            testID={testID && `${testID}-${option.value}`}
            style={styles.segment}
          >
            <ThemedText
              type="smallBold"
              themeColor={selected ? 'primary' : 'textSecondary'}
              numberOfLines={1}
              style={styles.label}
            >
              {option.label}
            </ThemedText>
            {option.count !== undefined ? (
              // Separate from the label so a truncated label ("Danger zo…")
              // still shows its count.
              <ThemedText type="smallBold" themeColor={selected ? 'primary' : 'textSecondary'} style={styles.count}>
                {` (${option.count})`}
              </ThemedText>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: PAD,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    gap: GAP,
  },
  indicator: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: Radius.small - PAD,
    borderCurve: 'continuous',
  },
  // Reduce motion: the indicator jumps instead of sliding.
  instant: { transitionDuration: 0 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.small - PAD,
    borderCurve: 'continuous',
  },
  label: { flexShrink: 1 },
  count: { flexShrink: 0 },
});
