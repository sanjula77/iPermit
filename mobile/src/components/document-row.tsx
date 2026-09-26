import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PickedFile } from '@/lib/file-upload';

// One tappable row per required document: status on the left, Add/Change on
// the right. Rows are meant to be stacked inside a Card with separators.
export function DocumentRow({
  label,
  value,
  hasError,
  onPress,
  testID,
}: {
  label: string;
  value: PickedFile | null;
  hasError?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const iconColor = hasError ? theme.danger : value ? theme.success : theme.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value ? value.name : 'not added'}${hasError ? ', rejected' : ''}. Tap to ${value ? 'change' : 'add'}`}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Ionicons
        name={hasError ? 'alert-circle' : value ? 'checkmark-circle' : 'document-outline'}
        size={24}
        color={iconColor}
      />
      <View style={styles.text}>
        <ThemedText>{label}</ThemedText>
        <ThemedText
          type="small"
          themeColor={hasError ? 'danger' : 'textSecondary'}
          numberOfLines={1}
          testID={testID && `${testID}-filename`}
        >
          {value ? value.name : 'Not added'}
        </ThemedText>
      </View>
      <ThemedText type="linkPrimary">{value ? 'Change' : 'Add'}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
