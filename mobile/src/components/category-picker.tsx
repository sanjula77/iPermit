import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, tint } from '@/constants/theme';
import { CATEGORY_INFO, VEHICLE_CATEGORIES } from '@/constants/vehicle-categories';
import { useTheme } from '@/hooks/use-theme';
import type { VehicleCategory } from '@/types/license';

// Pick the vehicle categories to apply for: a two-column grid of toggle tiles,
// each with the category code, an icon and a plain name.
export function CategoryPicker({
  value,
  onChange,
  disabled,
}: {
  value: VehicleCategory[];
  onChange: (next: VehicleCategory[]) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();

  function toggle(category: VehicleCategory) {
    if (disabled) return;
    onChange(value.includes(category) ? value.filter((c) => c !== category) : [...value, category]);
  }

  return (
    <View style={styles.grid}>
      {VEHICLE_CATEGORIES.map((category) => {
        const selected = value.includes(category);
        const info = CATEGORY_INFO[category];
        return (
          <Pressable
            key={category}
            onPress={() => toggle(category)}
            testID={`apply-category-${category}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected, disabled: !!disabled }}
            accessibilityLabel={`${category}, ${info.label}`}
            style={({ pressed }) => [
              styles.tile,
              {
                backgroundColor: selected ? tint(theme.primary, 'soft') : theme.backgroundElement,
                borderColor: selected ? theme.primary : theme.backgroundSelected,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <MaterialCommunityIcons name={info.icon} size={22} color={selected ? theme.primary : theme.textSecondary} />
            <View style={styles.text}>
              <ThemedText type="smallBold" themeColor={selected ? 'primary' : 'text'}>
                {category}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                {info.label}
              </ThemedText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: {
    // Two per row, allowing for the gap.
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
  },
  text: { flex: 1, minWidth: 0 },
});
