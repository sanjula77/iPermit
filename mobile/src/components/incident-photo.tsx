import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { getIncidentPhotoSource } from '@/api/road-incidents';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { usePhotoSource } from '@/hooks/use-photo-source';
import { useTheme } from '@/hooks/use-theme';

// The scene photo a driver attached to an incident: a preview in the list that
// opens full screen on tap. No caching, as the photo sits behind the login and
// is deleted when the incident ends.
export function IncidentPhoto({ incidentId, testID }: { incidentId: string; testID?: string }) {
  const theme = useTheme();
  const photo = usePhotoSource(() => getIncidentPhotoSource(incidentId), incidentId);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => photo && setOpen(true)}
        testID={testID}
        accessibilityRole="imagebutton"
        accessibilityLabel="Photo of the scene. Tap to enlarge"
        style={({ pressed }) => [
          styles.preview,
          { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        {photo ? (
          <>
            <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="none" />
            <View style={styles.expand}>
              <Ionicons name="expand-outline" size={16} color="#FFFFFF" />
            </View>
          </>
        ) : (
          <Ionicons name="image-outline" size={28} color={theme.textSecondary} />
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close photo"
        >
          {photo ? <Image source={photo} style={styles.full} contentFit="contain" cachePolicy="none" /> : null}
          <View style={styles.close}>
            <Ionicons name="close" size={20} color="#FFFFFF" />
            <ThemedText type="smallBold" style={styles.closeText}>
              Close
            </ThemedText>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  preview: {
    height: 160,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expand: {
    position: 'absolute',
    right: Spacing.two,
    bottom: Spacing.two,
    padding: Spacing.one,
    borderRadius: Radius.small,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  full: { width: '100%', height: '80%' },
  close: {
    position: 'absolute',
    top: Spacing.six,
    right: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  closeText: { color: '#FFFFFF' },
});
