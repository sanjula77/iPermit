import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PickedFile } from '@/lib/file-upload';

// A square slot for one photo: dashed "add" state when empty, the photo with a
// check when filled, a red outline when the server rejected this photo.
export function PhotoTile({
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
  const borderColor = hasError ? theme.danger : value ? 'transparent' : theme.backgroundSelected;

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value ? 'added' : 'not added'}${hasError ? ', rejected' : ''}. Tap to ${value ? 'replace' : 'add'}`}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: theme.backgroundElement,
          borderColor,
          // No border on a plain filled tile, so the photo reaches the edges.
          borderWidth: value && !hasError ? 0 : 2,
          borderStyle: value || hasError ? 'solid' : 'dashed',
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      {value ? (
        <>
          <Image source={{ uri: value.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={[styles.check, { backgroundColor: hasError ? theme.danger : theme.success }]}>
            <Ionicons name={hasError ? 'alert' : 'checkmark'} size={14} color={theme.onPrimary} />
          </View>
        </>
      ) : (
        <View style={styles.empty}>
          <Ionicons name="camera-outline" size={28} color={hasError ? theme.danger : theme.primary} />
          <ThemedText type="small" themeColor={hasError ? 'danger' : 'textSecondary'}>
            {label}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  check: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
