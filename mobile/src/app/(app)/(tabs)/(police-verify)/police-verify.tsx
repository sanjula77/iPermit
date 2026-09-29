import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';

import { extractErrorMessage } from '@/api/client';
import { lookupDriver, verifyFace, verifyQr } from '@/api/police';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { IconTile } from '@/components/icon-tile';
import { HeroScreen } from '@/components/hero-screen';
import { ListRow, ListSeparator } from '@/components/list-row';
import { SegmentedControl } from '@/components/segmented-control';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { takePhoto } from '@/lib/file-upload';
import type { DriverSummary, FaceMatchCandidate } from '@/types/police';

type Mode = 'face' | 'qr' | 'lookup';

// What the hero says for each mode.
const MODE_SUMMARY: Record<Mode, string> = {
  face: 'Take a photo of the driver. The match is a guide; you confirm the identity.',
  qr: 'Scan the QR code on the driver’s digital license.',
  lookup: 'Search by the driver’s NIC or license number.',
};

const MODE_OPTIONS: { label: string; value: Mode }[] = [
  { label: 'Face', value: 'face' },
  { label: 'QR', value: 'qr' },
  { label: 'NIC / License', value: 'lookup' },
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
    <HeroScreen title="Verify a driver" summary={MODE_SUMMARY[mode]} keyboardShouldPersistTaps="handled">
      <View style={styles.overlap}>
        <SegmentedControl<Mode> testID="police-tab" value={mode} onChange={changeMode} options={MODE_OPTIONS} />
      </View>

      {mode === 'face' ? (
        <FaceScanPanel onScan={handleFaceScan} isLoading={isLoading} />
      ) : mode === 'qr' ? (
        <QrScanPanel onToken={handleQrToken} isLoading={isLoading} />
      ) : (
        <LookupPanel onSubmit={handleLookup} isLoading={isLoading} />
      )}

      {error ? <Banner tone="danger" text={error} testID="police-verify-error" /> : null}

      {uncertainCandidates ? (
        <View style={styles.section}>
          <Banner
            tone="warning"
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
                  {i > 0 ? <ListSeparator /> : null}
                  <CandidateRow candidate={candidate} onPress={() => openDriver(candidate.driver)} />
                </Fragment>
              ))}
            </Card>
          ) : null}
        </View>
      ) : null}
    </HeroScreen>
  );
}



function CandidateRow({ candidate, onPress }: { candidate: FaceMatchCandidate; onPress: () => void }) {
  const theme = useTheme();
  const { driver } = candidate;
  // Cosine similarity can be negative for poor matches; show 0-100%.
  const match = `${Math.round(Math.min(Math.max(candidate.similarity, 0), 1) * 100)}% match`;

  const status = driver.license_status
    ? driver.license_status === 'ACTIVE'
      ? 'Active'
      : 'Suspended'
    : 'No license';

  return (
    <ListRow
      testID="police-candidate"
      onPress={onPress}
      accessibilityLabel={`${driver.email}, NIC ${driver.nic}, ${status}, ${match}. Open driver details`}
      leading={<IconTile icon="person" color={theme.textSecondary} />}
      title={driver.email}
      value={match}
      // NIC first: when the line is too long, the status truncates, never the NIC.
      meta={`NIC ${driver.nic} · ${status}`}
      chevron
    />
  );
}

// The panel's heading: the hero above already explains the mode.
function PanelIntro({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  const theme = useTheme();
  return (
    <View style={styles.intro}>
      <IconTile icon={icon} color={theme.primary} size={64} />
      <ThemedText type="subtitle" style={styles.centered}>
        {title}
      </ThemedText>
    </View>
  );
}

function FaceScanPanel({ onScan, isLoading }: { onScan: () => void; isLoading: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.panel}>
      <PanelIntro icon="scan-outline" title="Scan the driver’s face" />
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
          <PanelIntro icon="qr-code-outline" title="Scan the license QR" />
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
        <Banner
          tone="warning"
          icon="camera-outline"
          text="Camera access is off. Allow it in Settings, or enter the code manually below."
          action={{ label: 'Open Settings', onPress: () => Linking.openSettings() }}
        />
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
      <PanelIntro icon="search-outline" title="Look up a driver" />
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
  flex: { flex: 1 },
  centered: { textAlign: 'center' },
  panel: { gap: Spacing.three },
  // The mode picker floats over the hero's lower edge.
  overlap: { marginTop: -(Spacing.four + Spacing.three) },
  intro: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
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
  section: { gap: Spacing.two },
  list: {
    paddingVertical: 0,
    gap: 0,
  },
  linkButton: {
    alignSelf: 'center',
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
});
