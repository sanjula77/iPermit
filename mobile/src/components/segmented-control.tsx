import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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

  return (
    <View
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
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            testID={testID && `${testID}-${option.value}`}
            style={[
              styles.segment,
              selected && { backgroundColor: theme.backgroundSelected },
            ]}
          >
            <ThemedText
              type="smallBold"
              themeColor={selected ? 'text' : 'textSecondary'}
              numberOfLines={1}
              style={styles.label}
            >
              {option.label}
            </ThemedText>
            {option.count !== undefined ? (
              // Separate from the label so a truncated label ("Danger zo…")
              // still shows its count.
              <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'} style={styles.count}>
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
    padding: Spacing.half,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    gap: Spacing.half,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.small - Spacing.half,
    borderCurve: 'continuous',
  },
  label: { flexShrink: 1 },
  count: { flexShrink: 0 },
});
