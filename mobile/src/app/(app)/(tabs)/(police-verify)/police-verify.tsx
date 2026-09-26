import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { extractErrorMessage } from '@/api/client';
import { lookupDriver, verifyFace, verifyQr } from '@/api/police';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { SegmentedControl } from '@/components/segmented-control';
import { StatusBadge } from '@/components/status-badge';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { takePhoto } from '@/lib/file-upload';
import type { DriverSummary, FaceMatchCandidate } from '@/types/police';

type Mode = 'face' | 'qr' | 'lookup';

const MODE_OPTIONS: { label: string; value: Mode }[] = [
  { label: 'Face', value: 'face' },
  { label: 'QR', value: 'qr' },
  { label: 'NIC', value: 'lookup' },
];

function isMode(value: unknown): value is Mode {
  return value === 'face' || value === 'qr' || value === 'lookup';
}

export default function PoliceVerifyScreen() {
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>('face');
  const [isLoading, setIsLoading] = useState(false);
  // Blocks a same-frame double submit before isLoading has re-rendered.
  const loadingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  // Set only for a face scan the AI isn't confident about (REQ-6 AC4): the
  // officer must pick (or reject) a candidate themselves.
  const [uncertainCandidates, setUncertainCandidates] = useState<FaceMatchCandidate[] | null>(null);

  useEffect(() => {
    // Police Home opens this tab with a preselected mode; apply it once, then
    // clear the param so later visits keep the officer's own choice.
    if (isMode(modeParam)) {
      changeMode(modeParam);
      router.setParams({ mode: undefined });
    }
  }, [modeParam]);

  function changeMode(next: Mode) {
    setMode(next);
    setError(null);
    setUncertainCandidates(null);
  }

  function openDriver(driver: DriverSummary) {
    // Candidate summaries go stale once the officer acts on the driver (e.g.
    // records a violation), so don't leave them to be reopened on return.
    setUncertainCandidates(null);
    router.push({ pathname: '/(app)/police-driver', params: { driver: JSON.stringify(driver) } });
  }

  async function run(task: () => Promise<void>) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setError(null);
    setUncertainCandidates(null);
    setIsLoading(true);
    try {
      await task();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }

  async function handleFaceScan() {
    const photo = await takePhoto('officer-scan.jpg');
    if (!photo) return;
    await run(async () => {
      const result = await verifyFace(photo);
      // A single confident match goes straight to the driver -- REQ-6 AC4 only
      // requires officer-in-the-loop confirmation when the match is uncertain.
      if (!result.requires_manual_confirmation && result.best_match) {
        openDriver(result.best_match.driver);
      } else {
        setUncertainCandidates(result.candidates);
      }
    });
  }

  function handleQrToken(qrToken: string) {
    run(async () => openDriver(await verifyQr(qrToken)));
  }

  function handleLookup(nic: string, licenseNo: string) {
    run(async () =>
      openDriver(await lookupDriver({ nic: nic || undefined, licenseNo: licenseNo || undefined })),
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <ThemedView style={styles.form}>
        <SegmentedControl<Mode> testID="police-tab" value={mode} onChange={changeMode} options={MODE_OPTIONS} />

        {mode === 'face' ? (
          <FaceScanPanel onScan={handleFaceScan} isLoading={isLoading} />
        ) : mode === 'qr' ? (
          <QrScanPanel onToken={handleQrToken} isLoading={isLoading} />
        ) : (
          <LookupPanel onSubmit={handleLookup} isLoading={isLoading} />
        )}

        {error ? <Banner tone="danger" icon="alert-circle" text={error} testID="police-verify-error" /> : null}

        {uncertainCandidates ? (
          <View style={styles.section}>
            <Banner
              tone="warning"
              icon="warning"
              text={
                uncertainCandidates.length
                  ? 'Uncertain match. Confirm the driver’s identity before continuing, or use QR or NIC instead.'
                  : 'No enrolled driver resembles this photo closely enough to suggest. Use QR or NIC instead.'
              }
            />
            {uncertainCandidates.length ? (
              <Card style={styles.list}>
                {uncertainCandidates.map((candidate, i) => (
                  <Fragment key={candidate.driver.driver_id}>
                    {i > 0 ? <Separator /> : null}
                    <CandidateRow candidate={candidate} onPress={() => openDriver(candidate.driver)} />
                  </Fragment>
                ))}
              </Card>
            ) : null}
          </View>
        ) : null}
      </ThemedView>
    </ScrollView>
  );
}

function Separator() {
  const theme = useTheme();
  return <View style={[styles.separator, { backgroundColor: theme.backgroundSelected }]} />;
}

function Banner({
  tone,
  icon,
  text,
  testID,
}: {
  tone: 'danger' | 'warning';
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  testID?: string;
}) {
  const theme = useTheme();
  const colorKey: ThemeColor = tone;
  return (
    <View
      style={[styles.banner, { backgroundColor: `${theme[colorKey]}14` }]}
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      <Ionicons name={icon} size={18} color={theme[colorKey]} />
      <ThemedText type="small" themeColor={colorKey} selectable style={styles.flex}>
        {text}
      </ThemedText>
    </View>
  );
}

function CandidateRow({ candidate, onPress }: { candidate: FaceMatchCandidate; onPress: () => void }) {
  const theme = useTheme();
  const { driver } = candidate;
  // Cosine similarity can be negative for poor matches; show 0-100%.
  const match = `${Math.round(Math.min(Math.max(candidate.similarity, 0), 1) * 100)}% match`;

  return (
    <Pressable
      onPress={onPress}
      testID="police-candidate"
      accessibilityRole="button"
      accessibilityLabel={`${driver.email}, NIC ${driver.nic}, ${match}. Open driver details`}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Ionicons name="person-circle-outline" size={36} color={theme.textSecondary} />
      <View style={styles.flex}>
        <ThemedText numberOfLines={1}>{driver.email}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          NIC {driver.nic}
          {driver.license_status ? ` · ${driver.license_status === 'ACTIVE' ? 'Active' : 'Suspended'}` : ' · No license'}
        </ThemedText>
      </View>
      <StatusBadge tone="warning" icon="scan-outline" label={match} />
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

function PanelIntro({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.intro}>
      <View style={[styles.introIcon, { backgroundColor: `${theme.primary}1F` }]}>
        <Ionicons name={icon} size={32} color={theme.primary} />
      </View>
      <ThemedText type="subtitle" style={styles.centered}>
        {title}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.centered}>
        {text}
      </ThemedText>
    </View>
  );
}

function FaceScanPanel({ onScan, isLoading }: { onScan: () => void; isLoading: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.panel}>
      <PanelIntro
        icon="scan-outline"
        title="Scan the driver’s face"
        text="Take a clear photo of the driver’s face. The match is a guide; you confirm the identity."
      />
      <Button onPress={onScan} disabled={isLoading} testID="police-face-scan-button">
        {isLoading ? (
          <ActivityIndicator color={theme.onPrimary} />
        ) : (
          <Ionicons name="camera-outline" size={18} color={theme.onPrimary} />
        )}
        <ThemedText type="smallBold" themeColor="onPrimary">
          {isLoading ? 'Verifying…' : 'Capture photo'}
        </ThemedText>
      </Button>
    </View>
  );
}

function QrScanPanel({ onToken, isLoading }: { onToken: (token: string) => void; isLoading: boolean }) {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [cameraDenied, setCameraDenied] = useState(false);
  // The camera reports the same code many times per second; take the first.
  const handledRef = useRef(false);

  async function startScanning() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        // Otherwise the button would appear to do nothing.
        setCameraDenied(true);
        return;
      }
    }
    setCameraDenied(false);
    handledRef.current = false;
    setScanning(true);
  }

  function handleBarcodeScanned(result: { data: string }) {
    if (handledRef.current) return;
    handledRef.current = true;
    setScanning(false);
    onToken(result.data);
  }

  return (
    <View style={styles.panel}>
      {scanning && permission?.granted ? (
        <>
          <View style={styles.cameraWrapper} testID="police-qr-camera">
            <CameraView
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarcodeScanned}
            />
            <View style={styles.scanFrame} pointerEvents="none" />
          </View>
          <Button variant="secondary" onPress={() => setScanning(false)} testID="police-qr-cancel">
            <ThemedText type="smallBold">Cancel</ThemedText>
          </Button>
        </>
      ) : (
        <>
          <PanelIntro
            icon="qr-code-outline"
            title="Scan the license QR"
            text="Ask the driver to open their digital license and point the camera at the code."
          />
          <Button onPress={startScanning} disabled={isLoading} testID="police-qr-start-button">
            {isLoading ? (
              <ActivityIndicator color={theme.onPrimary} />
            ) : (
              <Ionicons name="qr-code-outline" size={18} color={theme.onPrimary} />
            )}
            <ThemedText type="smallBold" themeColor="onPrimary">
              {isLoading ? 'Verifying…' : 'Scan QR code'}
            </ThemedText>
          </Button>
        </>
      )}

      {cameraDenied ? (
        <View style={[styles.banner, { backgroundColor: `${theme.warning}14` }]}>
          <Ionicons name="camera-outline" size={18} color={theme.warning} />
          <View style={styles.flex}>
            <ThemedText type="small" themeColor="warning">
              Camera access is off. Allow it in Settings, or enter the code manually below.
            </ThemedText>
            <Pressable onPress={() => Linking.openSettings()} accessibilityRole="button" style={styles.linkButtonStart}>
              <ThemedText type="linkPrimary">Open Settings</ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {showManual ? (
        <>
          <TextField
            label="QR code token"
            value={manualToken}
            onChangeText={setManualToken}
            testID="police-qr-manual-input"
          />
          <Button
            variant="secondary"
            onPress={() => onToken(manualToken.trim())}
            disabled={!manualToken.trim() || isLoading}
            testID="police-qr-manual-submit"
          >
            <ThemedText type="smallBold">Verify code</ThemedText>
          </Button>
        </>
      ) : (
        <Pressable
          onPress={() => setShowManual(true)}
          accessibilityRole="button"
          style={styles.linkButton}
          testID="police-qr-manual-toggle"
        >
          <ThemedText type="linkPrimary">Enter code manually</ThemedText>
        </Pressable>
      )}
    </View>
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
  const canSubmit = !!(nic.trim() || licenseNo.trim()) && !isLoading;

  return (
    <View style={styles.panel}>
      <PanelIntro icon="search-outline" title="Look up a driver" text="Enter the driver’s NIC or license number." />
      <TextField
        label="NIC"
        value={nic}
        onChangeText={setNic}
        autoCapitalize="characters"
        testID="police-lookup-nic"
      />
      <TextField
        label="License number"
        value={licenseNo}
        onChangeText={setLicenseNo}
        autoCapitalize="characters"
        testID="police-lookup-license"
      />
      <Button onPress={() => onSubmit(nic.trim(), licenseNo.trim())} disabled={!canSubmit} testID="police-lookup-submit">
        {isLoading ? (
          <ActivityIndicator color={theme.onPrimary} />
        ) : (
          <Ionicons name="search-outline" size={18} color={theme.onPrimary} />
        )}
        <ThemedText type="smallBold" themeColor="onPrimary">
          {isLoading ? 'Looking up…' : 'Look up'}
        </ThemedText>
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  form: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  flex: { flex: 1 },
  centered: { textAlign: 'center' },
  panel: { gap: Spacing.three },
  intro: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  introIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  cameraWrapper: {
    height: 320,
    borderRadius: Radius.medium,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 200,
    height: 200,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: Radius.medium,
  },
  linkButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.one,
  },
  linkButtonStart: { alignSelf: 'flex-start' },
  section: { gap: Spacing.two },
  banner: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
  },
  list: {
    paddingVertical: 0,
    gap: 0,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
});
