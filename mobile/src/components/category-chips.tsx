import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, tint } from '@/constants/theme';
import { CATEGORY_INFO } from '@/constants/vehicle-categories';
import { useTheme } from '@/hooks/use-theme';
import type { LicenseCategory } from '@/types/license';

// A read-only wrapped list of the vehicle categories a licence holds, one pill
// per category: icon, code, and what it covers.
export function CategoryChips({ categories }: { categories: LicenseCategory[] }) {
  const theme = useTheme();

  if (categories.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        No vehicle categories on file.
      </ThemedText>
    );
  }

  return (
    <View style={styles.wrap} testID="driver-categories">
      {categories.map(({ category }) => {
        const info = CATEGORY_INFO[category];
        return (
          <View
            key={category}
            accessible
            accessibilityLabel={`${category}, ${info.label}`}
            style={[styles.chip, { backgroundColor: tint(theme.primary, 'soft') }]}
          >
            <MaterialCommunityIcons name={info.icon} size={18} color={theme.primary} />
            <ThemedText type="smallBold" themeColor="primary">
              {category}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {info.label}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 2,
    borderRadius: 999,
  },
});
