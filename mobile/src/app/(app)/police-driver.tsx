import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Fragment, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { extractErrorMessage } from '@/api/client';
import { recordViolation } from '@/api/police';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ProgressBar } from '@/components/progress-bar';
import { StatusBadge } from '@/components/status-badge';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import {
  VIOLATION_FINE,
  VIOLATION_ICON,
  VIOLATION_LABEL,
  VIOLATION_POINTS,
  VIOLATION_TYPES,
} from '@/constants/violations';
import { useTheme } from '@/hooks/use-theme';
import { formatLkr } from '@/lib/fine-status';
import { SUSPENSION_POINTS, pointsColorKey } from '@/lib/points';
import type { DriverSummary, ViolationType } from '@/types/police';

function parseDriver(param: string | undefined): DriverSummary | null {
  try {
    return param ? (JSON.parse(param) as DriverSummary) : null;
  } catch {
    return null;
  }
}

export default function PoliceDriverScreen() {
  const { driver: driverParam } = useLocalSearchParams<{ driver?: string }>();
  // The driver arrives as a route param from Verify; opened any other way
  // (e.g. a deep link) there's nothing to show.
  const [initialDriver] = useState(() => parseDriver(driverParam));
  if (!initialDriver) {
    return (
      <ThemedView style={styles.missing}>
        <EmptyState
          icon="person-outline"
          title="No driver selected"
          message="Open a driver from the Verify tab to see their details."
        />
      </ThemedView>
    );
  }
  return <DriverDetails initialDriver={initialDriver} />;
}

function DriverDetails({ initialDriver }: { initialDriver: DriverSummary }) {
  const theme = useTheme();
  const [driver, setDriver] = useState<DriverSummary>(initialDriver);
  const [violationType, setViolationType] = useState<ViolationType | null>(null);
  const [evidenceRef, setEvidenceRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Blocks a same-frame double submit before isSubmitting has re-rendered.
  const submittingRef = useRef(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const hasLicense = !!driver.license_no;
  const points = driver.points ?? 0;

  async function submitViolation(type: ViolationType) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setNotice(null);
    setIsSubmitting(true);
    try {
      const result = await recordViolation({
        driverId: driver.driver_id,
        type,
        evidenceRef: evidenceRef.trim() || undefined,
      });
      setDriver((prev) => ({
        ...prev,
        points: result.driver_points,
        license_status: result.license_status,
        violations: [result.violation, ...prev.violations],
      }));
      setEvidenceRef('');
      setViolationType(null);
      setNotice({
        kind: 'success',
        text:
          `Recorded ${VIOLATION_LABEL[result.violation.type].toLowerCase()}: ` +
          `${result.violation.points_deducted} points and a ${formatLkr(result.fine.amount)} fine.` +
          (result.license_status === 'SUSPENDED' ? ' The license is now suspended.' : ''),
      });
    } catch (err) {
      setNotice({ kind: 'error', text: extractErrorMessage(err) });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function confirmViolation() {
    if (!violationType) return;
    // Recording deducts points, issues a fine and can suspend the license:
    // show the consequence and ask first.
    const addPoints = VIOLATION_POINTS[violationType];
    const newTotal = points + addPoints;
    const willSuspend = driver.license_status === 'ACTIVE' && newTotal >= SUSPENSION_POINTS;
    const title = `Record ${VIOLATION_LABEL[violationType].toLowerCase()}?`;
    const message =
      `${driver.email} will receive ${addPoints} points (${newTotal} in total) and a ` +
      `${formatLkr(VIOLATION_FINE[violationType])} fine.` +
      (willSuspend
        ? ` Licenses are suspended at ${SUSPENSION_POINTS} points, so this suspends their license.`
        : driver.license_status === 'SUSPENDED'
          ? ' Their license is already suspended.'
          : '');
    if (Platform.OS === 'web') {
      // react-native-web's Alert.alert is a no-op.
      if (window.confirm(`${title}\n${message}`)) submitViolation(violationType);
      return;
    }
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Record', style: 'destructive', onPress: () => submitViolation(violationType) },
    ]);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <ThemedView style={styles.form}>
        <View style={styles.hero}>
          <Ionicons name="person-circle" size={64} color={theme.textSecondary} />
          <ThemedText type="subtitle" selectable style={styles.centered}>
            {driver.email}
          </ThemedText>
          <ThemedText themeColor="textSecondary" selectable>
            NIC {driver.nic}
          </ThemedText>
        </View>

        {hasLicense ? (
          <Card style={styles.licenseCard}>
            <View style={styles.spread}>
              <View style={styles.flex}>
                <ThemedText type="small" themeColor="textSecondary">
                  License
                </ThemedText>
                <ThemedText type="smallBold" selectable>
                  {driver.license_no}
                </ThemedText>
              </View>
              <StatusBadge
                testID="driver-license-status"
                tone={driver.license_status === 'ACTIVE' ? 'success' : 'danger'}
                icon={driver.license_status === 'ACTIVE' ? 'checkmark-circle' : 'ban'}
                label={driver.license_status === 'ACTIVE' ? 'Active' : 'Suspended'}
              />
            </View>
            <View
              style={styles.pointsBlock}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={`Demerit points, ${points} of ${SUSPENSION_POINTS}`}
              accessibilityValue={{ min: 0, max: SUSPENSION_POINTS, now: Math.min(points, SUSPENSION_POINTS) }}
            >
              <View style={styles.spread}>
                <ThemedText type="small" themeColor="textSecondary">
                  Demerit points
                </ThemedText>
                <ThemedText type="smallBold" style={styles.tabular}>
                  {points} / {SUSPENSION_POINTS}
                </ThemedText>
              </View>
              <ProgressBar value={points} max={SUSPENSION_POINTS} color={theme[pointsColorKey(points)]} />
            </View>
          </Card>
        ) : (
          <Banner kind="error" text="No license issued. A violation cannot be recorded." />
        )}

        {notice ? (
          <Banner
            kind={notice.kind}
            text={notice.text}
            testID={notice.kind === 'success' ? 'record-violation-success' : 'record-violation-error'}
          />
        ) : null}

        <View style={styles.section}>
          <SectionLabel text="Violation history" />
          {driver.violations.length === 0 ? (
            <Card>
              <ThemedText themeColor="textSecondary">No violations on record.</ThemedText>
            </Card>
          ) : (
            <Card style={styles.list}>
              {driver.violations.map((violation, i) => (
                <Fragment key={violation.id}>
                  {i > 0 ? <View style={[styles.separator, { backgroundColor: theme.backgroundSelected }]} /> : null}
                  <View style={styles.row}>
                    <View style={[styles.iconCircle, { backgroundColor: theme.background }]}>
                      <Ionicons name={VIOLATION_ICON[violation.type]} size={20} color={theme.text} />
                    </View>
                    <View style={styles.flex}>
                      <ThemedText>{VIOLATION_LABEL[violation.type]}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {new Date(violation.confirmed_at).toLocaleDateString()} · {violation.points_deducted} pts
                      </ThemedText>
                      {violation.evidence_ref ? (
                        <ThemedText type="small" themeColor="textSecondary" selectable>
                          Evidence: {violation.evidence_ref}
                        </ThemedText>
                      ) : null}
                    </View>
                  </View>
                </Fragment>
              ))}
            </Card>
          )}
        </View>

        {hasLicense ? (
          <View style={styles.section}>
            <SectionLabel text="Record a violation" />
            <View style={styles.typeGrid} accessibilityRole="radiogroup">
              {VIOLATION_TYPES.map((type) => {
                const selected = violationType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setViolationType(type)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${VIOLATION_LABEL[type]}, ${VIOLATION_POINTS[type]} points, ${formatLkr(VIOLATION_FINE[type])}`}
                    testID={`violation-type-${type}`}
                    style={({ pressed }) => [
                      styles.typeTile,
                      {
                        backgroundColor: selected ? `${theme.danger}14` : theme.backgroundElement,
                        borderColor: selected ? theme.danger : 'transparent',
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Ionicons name={VIOLATION_ICON[type]} size={22} color={selected ? theme.danger : theme.text} />
                    <ThemedText type="smallBold" themeColor={selected ? 'danger' : 'text'}>
                      {VIOLATION_LABEL[type]}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {VIOLATION_POINTS[type]} pts · {formatLkr(VIOLATION_FINE[type])}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            <TextField
              label="Evidence reference (optional)"
              placeholder="e.g. camera ID or report number"
              value={evidenceRef}
              onChangeText={setEvidenceRef}
              testID="violation-evidence-ref"
            />
            <Button
              variant="danger"
              onPress={confirmViolation}
              disabled={!violationType || isSubmitting}
              testID="record-violation-submit"
            >
              <Ionicons name="document-text-outline" size={18} color={theme.onPrimary} />
              <ThemedText type="smallBold" themeColor="onPrimary">
                {isSubmitting ? 'Recording…' : 'Record violation'}
              </ThemedText>
            </Button>
          </View>
        ) : null}
      </ThemedView>
    </ScrollView>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel} accessibilityRole="header">
      {text}
    </ThemedText>
  );
}

function Banner({ kind, text, testID }: { kind: 'success' | 'error'; text: string; testID?: string }) {
  const theme = useTheme();
  const colorKey: ThemeColor = kind === 'success' ? 'success' : 'danger';
  return (
    <View
      style={[styles.banner, { backgroundColor: `${theme[colorKey]}14` }]}
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      <Ionicons name={kind === 'success' ? 'checkmark-circle' : 'alert-circle'} size={18} color={theme[colorKey]} />
      <ThemedText type="small" themeColor={colorKey} selectable style={styles.flex}>
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  missing: { flex: 1, paddingHorizontal: Spacing.four },
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
  flex: { flex: 1 },
  centered: { textAlign: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
  hero: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  licenseCard: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  spread: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  pointsBlock: { gap: Spacing.two },
  banner: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
  },
  section: { gap: Spacing.two },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  typeTile: {
    // Two columns: half the row minus half the gap.
    flexBasis: '48%',
    flexGrow: 1,
    gap: Spacing.one,
    padding: Spacing.three,
    borderWidth: 2,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
  },
});
