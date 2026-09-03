import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PickedFile } from '@/lib/file-upload';

interface FileSlotProps {
  label: string;
  value: PickedFile | null;
  onTakePhoto?: () => void;
  onPickLibrary?: () => void;
  onPickDocument?: () => void;
  testID?: string;
}

export function FileSlot({
  label,
  value,
  onTakePhoto,
  onPickLibrary,
  onPickDocument,
  testID,
}: FileSlotProps) {
  const theme = useTheme();
  const isImage = value?.mimeType.startsWith('image/');

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="smallBold">{label}</ThemedText>

      <ThemedView type="backgroundElement" style={styles.preview}>
        {value && isImage ? (
          <Image source={{ uri: value.uri }} style={styles.thumbnail} contentFit="cover" />
        ) : value ? (
          <ThemedText type="small" selectable numberOfLines={1} testID={testID && `${testID}-filename`}>
            {value.name}
          </ThemedText>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            No file selected
          </ThemedText>
        )}
      </ThemedView>

      <View style={styles.actions}>
        {onTakePhoto ? (
          <Pressable
            style={[styles.actionButton, { borderColor: theme.backgroundSelected }]}
            onPress={onTakePhoto}
            testID={testID && `${testID}-camera`}
          >
            <ThemedText type="small">Camera</ThemedText>
          </Pressable>
        ) : null}
        {onPickLibrary ? (
          <Pressable
            style={[styles.actionButton, { borderColor: theme.backgroundSelected }]}
            onPress={onPickLibrary}
            testID={testID && `${testID}-library`}
          >
            <ThemedText type="small">Library</ThemedText>
          </Pressable>
        ) : null}
        {onPickDocument ? (
          <Pressable
            style={[styles.actionButton, { borderColor: theme.backgroundSelected }]}
            onPress={onPickDocument}
            testID={testID && `${testID}-document`}
          >
            <ThemedText type="small">Choose File</ThemedText>
          </Pressable>
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  preview: {
    height: 96,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: Spacing.two,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
});
