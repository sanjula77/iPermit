import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Fragment, useRef, useState } from 'react';
import { Alert, Platform, Pressable, type ScrollView, StyleSheet, View } from 'react-native';

import { extractErrorMessage } from '@/api/client';
import { recordViolation } from '@/api/police';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { HeroChip, HeroScreen } from '@/components/hero-screen';
import { IconTile } from '@/components/icon-tile';
import { ListRow, ListSeparator } from '@/components/list-row';
import { ProgressBar } from '@/components/progress-bar';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, tint } from '@/constants/theme';
import {
  VIOLATION_COLOR,
  VIOLATION_FINE,
  VIOLATION_ICON,
  VIOLATION_LABEL,
  VIOLATION_POINTS,
  VIOLATION_TYPES,
} from '@/constants/violations';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, formatLkr } from '@/lib/format';
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
  const scrollRef = useRef<ScrollView>(null);

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
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (err) {
      setNotice({ kind: 'error', text: extractErrorMessage(err) });
      scrollRef.current?.scrollTo({ y: 0, animated: true });
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
    <HeroScreen
      ref={scrollRef}
      underHeader
      keyboardShouldPersistTaps="handled"
      testID="driver-details"
      heroContent={
        <>
          <View style={styles.identity}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={28} color={theme.onBrand} />
            </View>
            <View style={styles.flex}>
              <ThemedText
                type="subtitle"
                themeColor="onBrand"
                selectable
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {driver.email}
              </ThemedText>
              <ThemedText type="small" themeColor="onBrand" selectable style={styles.dim}>
                NIC {driver.nic}
                {hasLicense ? ` · ${driver.license_no}` : ''}
              </ThemedText>
            </View>
          </View>
          {/* The result an officer needs first, at a glance. */}
          <HeroChip
            large
            testID="driver-license-status"
            icon={!hasLicense ? 'alert-circle' : driver.license_status === 'ACTIVE' ? 'checkmark-circle' : 'ban'}
            label={!hasLicense ? 'No license' : `License ${driver.license_status === 'ACTIVE' ? 'active' : 'suspended'}`}
          />
        </>
      }
    >
      {hasLicense ? (
        <Card variant="raised" style={[styles.pointsCard, styles.overlap]}>
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
        <View style={styles.overlap}>
          <Banner tone="danger" text="No license issued. A violation cannot be recorded." />
        </View>
      )}

      {notice ? (
        <Banner
          tone={notice.kind === 'success' ? 'success' : 'danger'}
          text={notice.text}
          testID={notice.kind === 'success' ? 'record-violation-success' : 'record-violation-error'}
        />
      ) : null}

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
                      backgroundColor: selected ? tint(theme.danger, 'subtle') : theme.backgroundElement,
                      borderColor: selected ? theme.danger : 'transparent',
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Ionicons name={VIOLATION_ICON[type]} size={22} color={selected ? theme.danger : theme.text} />
                  <ThemedText type="smallBold" themeColor={selected ? 'danger' : 'text'} numberOfLines={2}>
                    {VIOLATION_LABEL[type]}
                  </ThemedText>
                  {/* Points and fine on separate lines, so "LKR" never splits from its amount. */}
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {VIOLATION_POINTS[type]} pts
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.tabular}>
                    {formatLkr(VIOLATION_FINE[type])}
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
                {i > 0 ? <ListSeparator /> : null}
                <ListRow
                  leading={<IconTile icon={VIOLATION_ICON[violation.type]} color={theme[VIOLATION_COLOR[violation.type]]} />}
                  title={VIOLATION_LABEL[violation.type]}
                  meta={`${formatDate(violation.confirmed_at)} · ${violation.points_deducted} pts`}
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
  spread: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  pointsBlock: { gap: Spacing.two },
  pointsCard: { padding: Spacing.four },
  // The first card lifts over the hero's lower edge.
  overlap: { marginTop: -(Spacing.four + Spacing.three) },
  identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, alignSelf: 'stretch' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  dim: { opacity: 0.85 },
  section: { gap: Spacing.two },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    paddingVertical: 0,
    gap: 0,
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
    minWidth: 0,
    gap: Spacing.one,
    padding: Spacing.three,
    borderWidth: 2,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
  },
});
