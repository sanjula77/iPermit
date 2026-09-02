import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { submitApplication } from '@/api/applications';
import { extractErrorMessage } from '@/api/client';
import { FileSlot } from '@/components/file-slot';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { pickDocument, pickImageFromLibrary, takePhoto, type PickedFile } from '@/lib/file-upload';

const PHOTO_COUNT = 4;

export default function ApplyScreen() {
  const theme = useTheme();
  const [facePhotos, setFacePhotos] = useState<(PickedFile | null)[]>(
    Array(PHOTO_COUNT).fill(null),
  );
  const [nicDocument, setNicDocument] = useState<PickedFile | null>(null);
  const [medicalCert, setMedicalCert] = useState<PickedFile | null>(null);
  const [birthCert, setBirthCert] = useState<PickedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setPhotoAt(index: number, file: PickedFile | null) {
    setFacePhotos((prev) => prev.map((p, i) => (i === index ? file : p)));
  }

  async function handleTakePhoto(index: number) {
    const file = await takePhoto(`face-photo-${index + 1}.jpg`);
    if (file) setPhotoAt(index, file);
  }

  async function handlePickLibraryPhoto(index: number) {
    const file = await pickImageFromLibrary(`face-photo-${index + 1}.jpg`);
    if (file) setPhotoAt(index, file);
  }

  async function handlePickDocument(setter: (file: PickedFile) => void) {
    const file = await pickDocument();
    if (file) setter(file);
  }

  const allFilesSelected =
    facePhotos.every((p) => p !== null) && nicDocument && medicalCert && birthCert;

  async function handleSubmit() {
    if (!allFilesSelected || !nicDocument || !medicalCert || !birthCert) {
      setError('Please provide all 4 face photos and all 3 documents.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await submitApplication({
        facePhotos: facePhotos as PickedFile[],
        nicDocument,
        medicalCert,
        birthCert,
      });
      router.replace('/(app)');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <ThemedView style={styles.form}>
        <ThemedText type="title">Apply for License</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Provide 4 clear face photos and your NIC, medical certificate, and birth
          certificate. All 7 files are required.
        </ThemedText>

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Face Photos
        </ThemedText>
        {facePhotos.map((photo, index) => (
          <FileSlot
            key={index}
            label={`Photo ${index + 1}`}
            value={photo}
            onTakePhoto={() => handleTakePhoto(index)}
            onPickLibrary={() => handlePickLibraryPhoto(index)}
            testID={`apply-photo-${index}`}
          />
        ))}

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Documents
        </ThemedText>
        <FileSlot
          label="NIC"
          value={nicDocument}
          onPickDocument={() => handlePickDocument(setNicDocument)}
          testID="apply-nic"
        />
        <FileSlot
          label="Medical Certificate"
          value={medicalCert}
          onPickDocument={() => handlePickDocument(setMedicalCert)}
          testID="apply-medical"
        />
        <FileSlot
          label="Birth Certificate"
          value={birthCert}
          onPickDocument={() => handlePickDocument(setBirthCert)}
          testID="apply-birth"
        />

        {error ? (
          <ThemedText type="small" themeColor="danger" selectable testID="apply-error">
            {error}
          </ThemedText>
        ) : null}

        <Pressable
          style={[
            styles.button,
            { backgroundColor: theme.primary },
            (!allFilesSelected || isSubmitting) && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!allFilesSelected || isSubmitting}
          testID="apply-submit"
        >
          <ThemedText type="smallBold" themeColor="onPrimary">
            {isSubmitting ? 'Submitting…' : 'Submit Application'}
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  form: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  sectionTitle: {
    marginTop: Spacing.two,
  },
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
});
