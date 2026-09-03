import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { extractErrorMessage } from '@/api/client';
import { lookupDriver, verifyFace, verifyQr } from '@/api/police';
import { DriverSummaryCard } from '@/components/driver-summary-card';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { takePhoto } from '@/lib/file-upload';
import type { FaceMatchCandidate } from '@/types/police';

type Mode = 'face' | 'qr' | 'lookup';

export default function PoliceVerifyScreen() {
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('face');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresManualConfirmation, setRequiresManualConfirmation] = useState(false);
  const [candidates, setCandidates] = useState<FaceMatchCandidate[]>([]);

  function showSingleResult(candidate: FaceMatchCandidate) {
    setCandidates([candidate]);
    setRequiresManualConfirmation(false);
  }

  function openDriver(candidate: FaceMatchCandidate) {
    router.push({
      pathname: '/(app)/police-driver',
      params: { driver: JSON.stringify(candidate.driver) },
    });
  }

  async function handleFaceScan() {
    const photo = await takePhoto('officer-scan.jpg');
    if (!photo) return;
    setError(null);
    setIsLoading(true);
    try {
      const result = await verifyFace(photo);
      setCandidates(result.candidates);
      setRequiresManualConfirmation(result.requires_manual_confirmation);
      // A single confident match can go straight to the driver detail view --
      // REQ-6 AC4 only requires officer-in-the-loop confirmation when the
      // match is ambiguous, not for every lookup.
      if (!result.requires_manual_confirmation && result.best_match) {
        openDriver(result.best_match);
      }
    } catch (err) {
      setCandidates([]);
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleQrToken(qrToken: string) {
    setError(null);
    setIsLoading(true);
    try {
      const driver = await verifyQr(qrToken);
      const candidate = { driver, similarity: 1 };
      showSingleResult(candidate);
      openDriver(candidate);
    } catch (err) {
      setCandidates([]);
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLookup(nic: string, licenseNo: string) {
    setError(null);
    setIsLoading(true);
    try {
      const driver = await lookupDriver({ nic: nic || undefined, licenseNo: licenseNo || undefined });
      const candidate = { driver, similarity: 1 };
      showSingleResult(candidate);
      openDriver(candidate);
    } catch (err) {
      setCandidates([]);
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <ThemedView style={styles.form}>
        <ThemedText type="title">Verify Driver</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          A face-scan match must still be manually confirmed when the AI is not
          confident -- it assists identification, it does not replace your judgment.
        </ThemedText>

        <View style={styles.tabs}>
          {(['face', 'qr', 'lookup'] as Mode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => {
                setMode(m);
                setError(null);
                setCandidates([]);
              }}
              style={[
                styles.tab,
                { backgroundColor: mode === m ? theme.primary : theme.backgroundElement },
              ]}
              testID={`police-tab-${m}`}
            >
              <ThemedText
                type="smallBold"
                themeColor={mode === m ? 'onPrimary' : 'text'}
              >
                {m === 'face' ? 'Face Scan' : m === 'qr' ? 'QR Scan' : 'NIC / License'}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {mode === 'face' ? (
          <FaceScanPanel onScan={handleFaceScan} isLoading={isLoading} />
        ) : mode === 'qr' ? (
          <QrScanPanel onToken={handleQrToken} isLoading={isLoading} />
        ) : (
          <LookupPanel onSubmit={handleLookup} isLoading={isLoading} />
        )}

        {error ? (
          <ThemedText type="small" themeColor="danger" selectable testID="police-verify-error">
            {error}
          </ThemedText>
        ) : null}

        {requiresManualConfirmation ? (
          <ThemedView style={styles.candidatesSection}>
            <ThemedText type="smallBold" themeColor="danger">
              Low-confidence match -- confirm manually or use QR/NIC instead
            </ThemedText>
            {candidates.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No enrolled driver resembles this photo closely enough to suggest.
              </ThemedText>
            ) : (
              candidates.map((candidate) => (
                <Pressable
                  key={candidate.driver.driver_id}
                  onPress={() => openDriver(candidate)}
                  testID="police-candidate"
                >
                  <DriverSummaryCard driver={candidate.driver} similarity={candidate.similarity} />
                </Pressable>
              ))
            )}
          </ThemedView>
        ) : null}
      </ThemedView>
    </ScrollView>
  );
}

function FaceScanPanel({ onScan, isLoading }: { onScan: () => void; isLoading: boolean }) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.panel}>
      <Pressable
        style={[styles.button, { backgroundColor: theme.primary }, isLoading && styles.buttonDisabled]}
        onPress={onScan}
        disabled={isLoading}
        testID="police-face-scan-button"
      >
        <ThemedText type="smallBold" themeColor="onPrimary">
          {isLoading ? 'Verifying…' : 'Capture Driver Photo'}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function QrScanPanel({
  onToken,
  isLoading,
}: {
  onToken: (token: string) => void;
  isLoading: boolean;
}) {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [manualToken, setManualToken] = useState('');

  function handleBarcodeScanned(result: { data: string }) {
    setScanning(false);
    onToken(result.data);
  }

  return (
    <ThemedView style={styles.panel}>
      {scanning && permission?.granted ? (
        <View style={styles.cameraWrapper} testID="police-qr-camera">
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
        </View>
      ) : (
        <Pressable
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={async () => {
            if (!permission?.granted) {
              const result = await requestPermission();
              if (!result.granted) return;
            }
            setScanning(true);
          }}
          testID="police-qr-start-button"
        >
          <ThemedText type="smallBold" themeColor="onPrimary">
            Scan License QR
          </ThemedText>
        </Pressable>
      )}

      <ThemedText type="small" themeColor="textSecondary">
        Or enter the QR token manually:
      </ThemedText>
      <TextField
        label="QR Token"
        value={manualToken}
        onChangeText={setManualToken}
        testID="police-qr-manual-input"
      />
      <Pressable
        style={[
          styles.button,
          { backgroundColor: theme.backgroundSelected },
          (!manualToken || isLoading) && styles.buttonDisabled,
        ]}
        onPress={() => onToken(manualToken)}
        disabled={!manualToken || isLoading}
        testID="police-qr-manual-submit"
      >
        <ThemedText type="smallBold">{isLoading ? 'Verifying…' : 'Verify Token'}</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function LookupPanel({
  onSubmit,
  isLoading,
}: {
  onSubmit: (nic: string, licenseNo: string) => void;
  isLoading: boolean;
}) {
  const theme = useTheme();
  const [nic, setNic] = useState('');
  const [licenseNo, setLicenseNo] = useState('');

  return (
    <ThemedView style={styles.panel}>
      <TextField label="NIC" value={nic} onChangeText={setNic} testID="police-lookup-nic" />
      <ThemedText type="small" themeColor="textSecondary">
        or
      </ThemedText>
      <TextField
        label="License Number"
        value={licenseNo}
        onChangeText={setLicenseNo}
        testID="police-lookup-license"
      />
      <Pressable
        style={[
          styles.button,
          { backgroundColor: theme.primary },
          (!(nic || licenseNo) || isLoading) && styles.buttonDisabled,
        ]}
        onPress={() => onSubmit(nic, licenseNo)}
        disabled={!(nic || licenseNo) || isLoading}
        testID="police-lookup-submit"
      >
        <ThemedText type="smallBold" themeColor="onPrimary">
          {isLoading ? 'Looking up…' : 'Look Up Driver'}
        </ThemedText>
      </Pressable>
    </ThemedView>
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
  tabs: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tab: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  panel: {
    gap: Spacing.two,
  },
  cameraWrapper: {
    height: 280,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  candidatesSection: {
    gap: Spacing.two,
  },
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
});
