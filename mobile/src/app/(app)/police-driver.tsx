import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Fragment, useRef, useState } from 'react';
import { Alert, Platform, Pressable, type ScrollView, StyleSheet, View } from 'react-native';

import { extractErrorMessage } from '@/api/client';
import { recordViolation } from '@/api/police';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { CategoryChips } from '@/components/category-chips';
import { EmptyState } from '@/components/empty-state';
import { HeroScreen } from '@/components/hero-screen';
import { IconTile } from '@/components/icon-tile';
import { ListRow, ListSeparator } from '@/components/list-row';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, tint } from '@/constants/theme';
import {
  OTHER_DESCRIPTION_MAX,
  OTHER_DESCRIPTION_MIN,
  OTHER_FINE_PER_POINT,
  OTHER_MAX_POINTS,
  OTHER_MIN_POINTS,
  VIOLATION_COLOR,
  VIOLATION_FINE,
  VIOLATION_ICON,
  VIOLATION_LABEL,
  VIOLATION_POINTS,
  VIOLATION_TYPES,
  violationTitle,
} from '@/constants/violations';
import { useBrandHeaderOptions } from '@/hooks/use-brand-header';
import { useTheme } from '@/hooks/use-theme';
import { matchPercent, parseIdentification, type Identification } from '@/lib/face-match';
import { formatDateShort, formatLkr } from '@/lib/format';
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
  const {
    driver: driverParam,
    method,
    similarity,
    confirmed,
  } = useLocalSearchParams<{ driver?: string; method?: string; similarity?: string; confirmed?: string }>();
  // The driver arrives as a route param from Verify; opened any other way
  // (e.g. a deep link) there's nothing to show.
  const brandHeader = useBrandHeaderOptions();
  const [initialDriver] = useState(() => parseDriver(driverParam));
  const [identification] = useState(() => parseIdentification({ method, similarity, confirmed }));
  if (!initialDriver) {
    return (
      <ThemedView style={styles.missing}>
        {/* This screen draws its own top bar normally; here, show the native one. */}
        <Stack.Screen options={{ ...brandHeader, headerShown: true }} />
        <EmptyState
          icon="person-outline"
          title="No driver selected"
          message="Open a driver from the Verify tab to see their details."
        />
      </ThemedView>
    );
  }
  return <DriverDetails initialDriver={initialDriver} identification={identification} />;
}

function DriverDetails({
  initialDriver,
  identification,
}: {
  initialDriver: DriverSummary;
  // How the officer found this driver (null when opened from Police Home).
  identification: Identification | null;
}) {
  const theme = useTheme();
  const [driver, setDriver] = useState<DriverSummary>(initialDriver);
  const [selected, setSelected] = useState<ViolationType[]>([]);
  // An "other" violation: what the officer saw, and the points they give it.
  const [otherText, setOtherText] = useState('');
  const [otherPoints, setOtherPoints] = useState(OTHER_MIN_POINTS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Blocks a same-frame double submit before isSubmitting has re-rendered.
  const submittingRef = useRef(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const hasLicense = !!driver.license_no;
  const points = driver.points ?? 0;
  const pointsFor = (type: ViolationType) => (type === 'OTHER' ? otherPoints : VIOLATION_POINTS[type]);
  const fineFor = (type: ViolationType) => (type === 'OTHER' ? otherPoints * OTHER_FINE_PER_POINT : VIOLATION_FINE[type]);
  const selectedPoints = selected.reduce((sum, type) => sum + pointsFor(type), 0);
  const selectedFines = selected.reduce((sum, type) => sum + fineFor(type), 0);
  // An "other" violation needs a written description before it can be recorded.
  const otherReady = !selected.includes('OTHER') || otherText.trim().length >= OTHER_DESCRIPTION_MIN;
  const labelFor = (type: ViolationType) => violationTitle(type, type === 'OTHER' ? otherText.trim() : null);

  function toggle(type: ViolationType) {
    setSelected((current) =>
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type],
    );
  }

  // The backend records one violation per request (each in its own
  // transaction), so they are sent one after another, in list order. If one
  // fails, the ones before it stay recorded and the message says exactly which.
  async function submitViolations(types: ViolationType[]) {
    if (submittingRef.current || types.length === 0) return;
    submittingRef.current = true;
    setNotice(null);
    setIsSubmitting(true);
    const recorded: string[] = [];
    let totalPoints = 0;
    let totalFines = 0;
    let suspended = false;
    try {
      for (const type of types) {
        const result = await recordViolation({
          driverId: driver.driver_id,
          type,
          ...(type === 'OTHER' ? { description: otherText.trim(), points: otherPoints } : {}),
        });
        recorded.push(labelFor(type).toLowerCase());
        totalPoints += result.violation.points_deducted;
        totalFines += result.fine.amount;
        suspended = result.license_status === 'SUSPENDED';
        setDriver((prev) => ({
          ...prev,
          points: result.driver_points,
          license_status: result.license_status,
          violations: [result.violation, ...prev.violations],
        }));
      }
      setSelected([]);
      setOtherText('');
      setOtherPoints(OTHER_MIN_POINTS);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setNotice({
        kind: 'success',
        text:
          `Recorded ${recorded.join(', ')}: ${totalPoints} points and ${formatLkr(totalFines)} in fines.` +
          (suspended ? ' The license is now suspended.' : ''),
      });
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      // Keep only the ones that weren't recorded selected, so a retry doesn't
      // record the others twice.
      setSelected(types.slice(recorded.length));
      setNotice({
        kind: 'error',
        text:
          (recorded.length ? `Recorded ${recorded.join(', ')}, then stopped. ` : '') +
          `Couldn't record ${labelFor(types[recorded.length]).toLowerCase()}: ${extractErrorMessage(err)}`,
      });
    } finally {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function confirmViolations() {
    if (selected.length === 0 || !otherReady) return;
    // Recording adds points, issues fines and can suspend the license: show
    // the combined consequence and ask first.
    const types = VIOLATION_TYPES.filter((t) => selected.includes(t));
    const newTotal = points + selectedPoints;
    const willSuspend = driver.license_status === 'ACTIVE' && newTotal >= SUSPENSION_POINTS;
    const title =
      types.length === 1
        ? `Record ${labelFor(types[0]).toLowerCase()}?`
        : `Record ${types.length} violations?`;
    const message =
      (types.length > 1 ? `${types.map((t) => labelFor(t)).join(', ')}.\n\n` : '') +
      `${driver.email} will receive ${selectedPoints} points (${newTotal} in total) and ` +
      `${formatLkr(selectedFines)} in fines.` +
      (willSuspend
        ? ` Licenses are suspended at ${SUSPENSION_POINTS} points, so this suspends their license.`
        : driver.license_status === 'SUSPENDED'
          ? ' Their license is already suspended.'
          : '');
    if (Platform.OS === 'web') {
      // react-native-web's Alert.alert is a no-op.
      if (window.confirm(`${title}\n${message}`)) submitViolations(types);
      return;
    }
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Record', style: 'destructive', onPress: () => submitViolations(types) },
    ]);
  }

  const statusShort = !hasLicense ? 'No license' : driver.license_status === 'ACTIVE' ? 'Active' : 'Suspended';
  const statusLabel = !hasLicense ? 'No license issued' : `License ${statusShort.toLowerCase()}`;
  const statusColor = !hasLicense || driver.license_status !== 'ACTIVE' ? theme.danger : theme.success;
  const statusIcon = !hasLicense ? 'alert-circle' : driver.license_status === 'ACTIVE' ? 'checkmark-circle' : 'ban';

  return (
    <HeroScreen
      ref={scrollRef}
      title="Driver details"
      onBack={() => router.back()}
      keyboardShouldPersistTaps="handled"
      testID="driver-details"
      heroContent={
        <>
          <View style={styles.identity}>
            <View style={styles.avatar}>
              <ThemedText type="subtitle" themeColor="onBrand">
                {driver.email.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
            <View style={styles.flex}>
              <ThemedText themeColor="onBrand" selectable numberOfLines={1} style={styles.bold}>
                {driver.email}
              </ThemedText>
              <ThemedText type="small" themeColor="onBrand" selectable numberOfLines={1} style={styles.dim}>
                NIC {driver.nic}
              </ThemedText>
            </View>
            {/* The result an officer needs first, at a glance. */}
            <View
              testID="driver-license-status"
              accessible
              accessibilityLabel={statusLabel}
              style={[styles.status, { backgroundColor: statusColor }]}
            >
              <Ionicons name={statusIcon} size={14} color="#ffffff" />
              <ThemedText type="smallBold" style={styles.statusText}>
                {statusShort}
              </ThemedText>
            </View>
          </View>
          <View style={styles.pills}>
            {identification ? <IdentificationPill identification={identification} /> : null}
            {hasLicense ? (
              <View
                style={styles.pill}
                accessible
                accessibilityLabel={`Demerit points, ${points} of ${SUSPENSION_POINTS}`}
              >
                <View style={styles.pillLabel}>
                  {/* Green / amber / red as points near the suspension limit. */}
                  <View style={[styles.pointsDot, { backgroundColor: theme[pointsColorKey(points)] }]} />
                  <ThemedText type="small" themeColor="onBrand" style={styles.dim}>
                    Points
                  </ThemedText>
                </View>
                <ThemedText themeColor="onBrand" style={[styles.pillValue, styles.tabular]}>
                  {points}/{SUSPENSION_POINTS}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </>
      }
    >
      {!hasLicense ? (
        <View style={styles.overlap}>
          <Banner tone="danger" text="No license issued. A violation cannot be recorded." />
        </View>
      ) : null}

      {notice ? (
        <Banner
          tone={notice.kind === 'success' ? 'success' : 'danger'}
          text={notice.text}
          testID={notice.kind === 'success' ? 'record-violation-success' : 'record-violation-error'}
        />
      ) : null}

      {hasLicense ? (
        <Card variant="raised" style={[styles.recordCard, notice ? null : styles.overlap]} testID="driver-categories-card">
          <ThemedText type="smallBold" accessibilityRole="header">
            Licensed to drive
          </ThemedText>
          <CategoryChips categories={driver.categories} />
        </Card>
      ) : null}

      {hasLicense ? (
        <Card variant="raised" style={styles.recordCard}>
          <View style={styles.recordHeader}>
            <ThemedText type="smallBold" accessibilityRole="header">
              Record violations
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Select all that apply
            </ThemedText>
          </View>
          <View>
            {VIOLATION_TYPES.map((type, i) => {
              const isSelected = selected.includes(type);
              const color = theme[VIOLATION_COLOR[type]];
              return (
                <Fragment key={type}>
                  {i > 0 ? <ListSeparator /> : null}
                  <Pressable
                    onPress={() => toggle(type)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`${VIOLATION_LABEL[type]}, ${pointsFor(type)} points, ${formatLkr(fineFor(type))}`}
                    testID={`violation-type-${type}`}
                    style={({ pressed }) => [
                      styles.typeRow,
                      isSelected && { backgroundColor: tint(theme.primary, 'subtle') },
                      { opacity: pressed ? 0.6 : 1 },
                    ]}
                  >
                    <IconTile icon={VIOLATION_ICON[type]} color={color} size={36} />
                    <View style={styles.flex}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {VIOLATION_LABEL[type]}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {type === 'OTHER' && !isSelected ? `${OTHER_MIN_POINTS}–${OTHER_MAX_POINTS} pts` : `+${pointsFor(type)} pts`}
                      </ThemedText>
                    </View>
                    <ThemedText type="smallBold" style={styles.tabular}>
                      {type === 'OTHER' && !isSelected ? 'You choose' : formatLkr(fineFor(type))}
                    </ThemedText>
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={isSelected ? theme.primary : theme.textSecondary}
                    />
                  </Pressable>
                  {type === 'OTHER' && isSelected ? (
                    <View style={styles.otherForm} testID="other-violation-form">
                      <TextField
                        label="What happened?"
                        value={otherText}
                        onChangeText={setOtherText}
                        maxLength={OTHER_DESCRIPTION_MAX}
                        placeholder="e.g. Parked on a footpath"
                        hint={`${OTHER_DESCRIPTION_MIN}-${OTHER_DESCRIPTION_MAX} characters. The driver sees this text.`}
                        testID="other-violation-text"
                      />
                      <View style={styles.stepperRow}>
                        <View style={styles.flex}>
                          <ThemedText type="smallBold">Points</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {`${OTHER_MIN_POINTS}–${OTHER_MAX_POINTS}; fine ${formatLkr(OTHER_FINE_PER_POINT)} per point`}
                          </ThemedText>
                        </View>
                        <Pressable
                          onPress={() => setOtherPoints((p) => Math.max(OTHER_MIN_POINTS, p - 1))}
                          accessibilityRole="button"
                          accessibilityLabel="Fewer points"
                          hitSlop={8}
                          testID="other-points-minus"
                          style={[styles.stepButton, { backgroundColor: theme.backgroundSelected }]}
                        >
                          <Ionicons name="remove" size={20} color={theme.text} />
                        </Pressable>
                        <ThemedText type="subtitle" style={styles.stepValue} testID="other-points-value">
                          {otherPoints}
                        </ThemedText>
                        <Pressable
                          onPress={() => setOtherPoints((p) => Math.min(OTHER_MAX_POINTS, p + 1))}
                          accessibilityRole="button"
                          accessibilityLabel="More points"
                          hitSlop={8}
                          testID="other-points-plus"
                          style={[styles.stepButton, { backgroundColor: theme.backgroundSelected }]}
                        >
                          <Ionicons name="add" size={20} color={theme.text} />
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </Fragment>
              );
            })}
          </View>
          {selected.length > 0 ? (
            <View style={[styles.totals, { backgroundColor: tint(theme.danger, 'subtle') }]} testID="record-violation-totals">
              <ThemedText type="small" themeColor="textSecondary">
                {selected.length} selected
              </ThemedText>
              <ThemedText type="smallBold" style={styles.tabular}>
                +{selectedPoints} pts · {formatLkr(selectedFines)}
              </ThemedText>
            </View>
          ) : null}
          <Button
            variant="danger"
            onPress={confirmViolations}
            disabled={selected.length === 0 || !otherReady || isSubmitting}
            testID="record-violation-submit"
          >
            <Ionicons name="document-text-outline" size={18} color={theme.onPrimary} />
            <ThemedText type="smallBold" themeColor="onPrimary">
              {isSubmitting
                ? 'Recording…'
                : selected.length > 1
                  ? `Record ${selected.length} violations`
                  : 'Record violation'}
            </ThemedText>
          </Button>
        </Card>
      ) : null}

      <View style={styles.section}>
        <SectionLabel text={`History (${driver.violations.length})`} />
        {driver.violations.length === 0 ? (
          <Card>
            <ThemedText themeColor="textSecondary">No violations on record.</ThemedText>
          </Card>
        ) : (
          <Card style={styles.list}>
            {driver.violations.map((violation, i) => (
              <Fragment key={violation.id}>
                {i > 0 ? <ListSeparator /> : null}
                <ListRow
                  leading={<IconTile icon={VIOLATION_ICON[violation.type]} color={theme[VIOLATION_COLOR[violation.type]]} />}
                  title={violationTitle(violation.type, violation.description)}
                  meta={`${formatDateShort(violation.confirmed_at)} · ${violation.points_deducted} pts`}
                  footer={
                    violation.evidence_ref ? (
                      <ThemedText type="small" themeColor="textSecondary" selectable>
                        Evidence: {violation.evidence_ref}
                      </ThemedText>
                    ) : null
                  }
                />
              </Fragment>
            ))}
          </Card>
        )}
      </View>
    </HeroScreen>
  );
}

// A figure pill on the hero for how the driver was identified: the face-match
// percentage after a scan, or the method for QR / lookup.
function IdentificationPill({ identification }: { identification: Identification }) {
  const label =
    identification.method === 'face'
      ? 'Face match'
      : identification.method === 'qr'
        ? 'Verified by'
        : 'Found by';
  const value =
    identification.method === 'face'
      ? `${matchPercent(identification.similarity)}%`
      : identification.method === 'qr'
        ? 'QR'
        : 'NIC';
  return (
    <View
      style={styles.pill}
      testID={identification.method === 'face' ? 'driver-face-match' : 'driver-identification'}
      accessible
      accessibilityLabel={
        identification.method === 'face'
          ? `Face match ${matchPercent(identification.similarity)} percent`
          : identification.method === 'qr'
            ? 'Verified by license QR'
            : 'Found by NIC or license number'
      }
    >
      <ThemedText type="small" themeColor="onBrand" style={styles.dim}>
        {label}
      </ThemedText>
      <ThemedText themeColor="onBrand" style={[styles.pillValue, styles.tabular]}>
        {value}
      </ThemedText>
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel} accessibilityRole="header">
      {text}
    </ThemedText>
  );
}


const styles = StyleSheet.create({
  missing: { flex: 1, paddingHorizontal: Spacing.four },
  flex: { flex: 1 },
  centered: { textAlign: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
  // The first card lifts over the hero's lower edge.
  overlap: { marginTop: -(Spacing.four + Spacing.three) },
  identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, alignSelf: 'stretch' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  dim: { opacity: 0.85 },
  bold: { fontWeight: 700 },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two + Spacing.half,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  // White on the success/danger fill in both themes.
  statusText: { color: '#ffffff' },
  pills: { flexDirection: 'row', gap: Spacing.two, alignSelf: 'stretch' },
  // Translucent white figure pills on the brand hero.
  pill: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  pillLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  pointsDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: '#ffffff' },
  pillValue: { fontSize: 20, lineHeight: 26, fontWeight: 700 },
  recordHeader: { gap: Spacing.half },
  totals: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.small,
  },
  recordCard: { padding: Spacing.three, gap: Spacing.three, borderRadius: Radius.large },
  otherForm: { gap: Spacing.three, paddingVertical: Spacing.three, paddingHorizontal: Spacing.two },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  stepButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 24, textAlign: 'center' },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 60,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
  },
  // Translucent white panel on the brand hero.
  section: { gap: Spacing.two },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    paddingVertical: 0,
    gap: 0,
  },
});
