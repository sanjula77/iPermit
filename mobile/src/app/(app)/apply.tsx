import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Fragment, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { submitApplication } from '@/api/applications';
import { ApiError, extractErrorMessage } from '@/api/client';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { DocumentRow } from '@/components/document-row';
import { PhotoTile } from '@/components/photo-tile';
import { ProgressBar } from '@/components/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { pickDocument, pickImageFromLibrary, takePhoto, type PickedFile } from '@/lib/file-upload';

const PHOTO_COUNT = 4;
const REQUIRED_FILE_COUNT = PHOTO_COUNT + 3;

const PHOTO_TIPS = [
  'One clear face per photo, no one else in frame',
  'Good, even lighting, not too dark or too bright',
  "Hold the phone at arm's length, face filling most of the frame",
  'Keep the phone steady to avoid blur',
];

type DocumentField = 'nic_document' | 'medical_cert' | 'birth_cert';

const DOCUMENTS: { field: DocumentField; label: string; testID: string }[] = [
  { field: 'nic_document', label: 'NIC', testID: 'apply-nic' },
  { field: 'medical_cert', label: 'Medical Certificate', testID: 'apply-medical' },
  { field: 'birth_cert', label: 'Birth Certificate', testID: 'apply-birth' },
];

// Which input the server rejected, from its structured 422 detail.
type FieldError = { field: string; index: number | null };

type SubmitError = { kind: 'rejected' | 'failed'; message: string; field: FieldError | null };

function toSubmitError(err: unknown): SubmitError {
  // Only the application endpoint's own rejections ({ field, index, message })
  // mean "fix this input". Anything else -- network, server fault, FastAPI's
  // generic validation list -- is not something better photos would fix.
  const detail = err instanceof ApiError ? (err.detail as { field?: unknown; index?: unknown; message?: unknown }) : null;
  if (err instanceof ApiError && err.status === 422 && detail && typeof detail.message === 'string') {
    const field =
      typeof detail.field === 'string'
        ? { field: detail.field, index: typeof detail.index === 'number' ? detail.index : null }
        : null;
    return { kind: 'rejected', message: err.message, field };
  }
  return { kind: 'failed', message: extractErrorMessage(err), field: null };
}

export default function ApplyScreen() {
  const theme = useTheme();
  const [facePhotos, setFacePhotos] = useState<(PickedFile | null)[]>(
    Array(PHOTO_COUNT).fill(null),
  );
  const [documents, setDocuments] = useState<Record<DocumentField, PickedFile | null>>({
    nic_document: null,
    medical_cert: null,
    birth_cert: null,
  });
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State updates land after a re-render, so a same-frame double tap would
  // pass an isSubmitting check; the ref blocks it synchronously.
  const submittingRef = useRef(false);

  const fieldError = submitError?.field ?? null;
  const photoHasError = (index: number) =>
    fieldError?.field === 'face_photos' && (fieldError.index === index || fieldError.index === null);

  // Replacing the input the server rejected clears its highlight.
  function clearErrorFor(field: string, index: number | null) {
    if (fieldError && fieldError.field === field && (fieldError.index === null || fieldError.index === index)) {
      setSubmitError(null);
    }
  }

  function setPhotoAt(index: number, file: PickedFile) {
    setFacePhotos((prev) => prev.map((p, i) => (i === index ? file : p)));
    clearErrorFor('face_photos', index);
  }

  function choosePhotoSource(index: number) {
    if (isSubmitting) return;
    // Android's native dialog shows at most three buttons, so replacing a photo
    // is done by picking a new one rather than a separate Remove action.
    Alert.alert(`Photo ${index + 1}`, undefined, [
      {
        text: 'Take photo',
        onPress: async () => {
          const file = await takePhoto(`face-photo-${index + 1}.jpg`);
          if (file) setPhotoAt(index, file);
        },
      },
      {
        text: 'Choose from library',
        onPress: async () => {
          const file = await pickImageFromLibrary(`face-photo-${index + 1}.jpg`);
          if (file) setPhotoAt(index, file);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function chooseDocument(field: DocumentField) {
    if (isSubmitting) return;
    const file = await pickDocument();
    if (file) {
      setDocuments((prev) => ({ ...prev, [field]: file }));
      clearErrorFor(field, null);
    }
  }

  const filesReadyCount =
    facePhotos.filter((p) => p !== null).length + Object.values(documents).filter(Boolean).length;
  const allFilesSelected = filesReadyCount === REQUIRED_FILE_COUNT;

  async function handleSubmit() {
    const { nic_document, medical_cert, birth_cert } = documents;
    if (submittingRef.current || !allFilesSelected || !nic_document || !medical_cert || !birth_cert) {
      return;
    }
    submittingRef.current = true;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await submitApplication({
        facePhotos: facePhotos as PickedFile[],
        nicDocument: nic_document,
        medicalCert: medical_cert,
        birthCert: birth_cert,
      });
      router.replace('/(app)/(tabs)/(home)');
    } catch (err) {
      setSubmitError(toSubmitError(err));
    } finally {
      submittingRef.current = false;
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
        <View style={styles.progress}>
          <ThemedText themeColor="textSecondary">
            Add 4 face photos and 3 documents to apply for your digital license.
          </ThemedText>
          <View
            style={styles.progressRow}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`${filesReadyCount} of ${REQUIRED_FILE_COUNT} files ready`}
            accessibilityValue={{ min: 0, max: REQUIRED_FILE_COUNT, now: filesReadyCount }}
          >
            <View style={styles.progressBar}>
              <ProgressBar value={filesReadyCount} max={REQUIRED_FILE_COUNT} />
            </View>
            <ThemedText type="smallBold" testID="apply-progress" style={styles.tabular}>
              {filesReadyCount} of {REQUIRED_FILE_COUNT} ready
            </ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
            Face photos
          </ThemedText>

          <Card testID="apply-photo-tips" style={styles.tips}>
            {PHOTO_TIPS.map((tip) => (
              <View key={tip} style={styles.tipRow}>
                <Ionicons name="checkmark" size={16} color={theme.primary} />
                <ThemedText type="small" themeColor="textSecondary" style={styles.tipText}>
                  {tip}
                </ThemedText>
              </View>
            ))}
          </Card>

          {[0, 2].map((rowStart) => (
            <View key={rowStart} style={styles.photoRow}>
              {[rowStart, rowStart + 1].map((index) => (
                <PhotoTile
                  key={index}
                  label={`Photo ${index + 1}`}
                  value={facePhotos[index]}
                  hasError={photoHasError(index)}
                  onPress={() => choosePhotoSource(index)}
                  testID={`apply-photo-${index}`}
                />
              ))}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
            Documents
          </ThemedText>
          <Card style={styles.documents}>
            {DOCUMENTS.map((doc, i) => (
              <Fragment key={doc.field}>
                {i > 0 ? <View style={[styles.separator, { backgroundColor: theme.backgroundSelected }]} /> : null}
                <DocumentRow
                  label={doc.label}
                  value={documents[doc.field]}
                  hasError={fieldError?.field === doc.field}
                  onPress={() => chooseDocument(doc.field)}
                  testID={doc.testID}
                />
              </Fragment>
            ))}
          </Card>
        </View>

        {submitError ? (
          <View
            style={[styles.errorBanner, { borderColor: theme.danger, backgroundColor: `${theme.danger}14` }]}
            testID="apply-error"
            accessibilityLiveRegion="polite"
          >
            <ThemedText type="smallBold" themeColor="danger">
              {submitError.kind === 'rejected'
                ? "We couldn't accept your files"
                : "Couldn't submit your application"}
            </ThemedText>
            <ThemedText type="small" themeColor="danger" selectable>
              {submitError.message}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {submitError.kind === 'failed'
                ? 'Please try again in a moment. If it keeps failing, check your connection.'
                : submitError.field?.field === 'face_photos'
                  ? 'Retake the highlighted photo using the tips above, then submit again.'
                  : submitError.field
                    ? 'Replace the highlighted file, then submit again.'
                    : 'Check your files and submit again.'}
            </ThemedText>
          </View>
        ) : null}

        <Button
          variant="primary"
          disabled={!allFilesSelected || isSubmitting}
          onPress={handleSubmit}
          testID="apply-submit"
        >
          <Ionicons name="paper-plane-outline" size={18} color={theme.onPrimary} />
          <ThemedText type="smallBold" themeColor="onPrimary">
            {isSubmitting ? 'Submitting…' : 'Submit Application'}
          </ThemedText>
        </Button>
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
    paddingVertical: Spacing.four,
  },
  form: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  progress: { gap: Spacing.two },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  progressBar: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  section: { gap: Spacing.two },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tips: { gap: Spacing.one },
  tipRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tipText: { flex: 1 },
  photoRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  documents: {
    paddingVertical: 0,
    gap: 0,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    borderCurve: 'continuous',
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
