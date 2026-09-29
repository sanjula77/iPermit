import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';

import { extractErrorMessage } from '@/api/client';
import { getMySummary, lookupDriver } from '@/api/police';
import { listNearbyIncidents } from '@/api/road-incidents';
import { Banner } from '@/components/banner';
import { Card } from '@/components/card';
import { FadeInItem } from '@/components/fade-in-item';
import { HeroScreen } from '@/components/hero-screen';
import { IconTile } from '@/components/icon-tile';
import { ListRow } from '@/components/list-row';
import { PressableScale } from '@/components/pressable-scale';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing, tint } from '@/constants/theme';
import { VIOLATION_COLOR, VIOLATION_ICON, VIOLATION_LABEL } from '@/constants/violations';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useTheme } from '@/hooks/use-theme';
import { formatLkr } from '@/lib/format';
import { greeting } from '@/lib/greeting';
import { relativeTime } from '@/lib/relative-time';
import type { OfficerSummary, RecentViolation } from '@/types/police';

type VerifyMode = 'face' | 'qr' | 'lookup';

function openVerify(mode: VerifyMode) {
  router.navigate({ pathname: '/(app)/(tabs)/(police-verify)/police-verify', params: { mode } });
}

// Police Home: start a verification (face scan first, QR and lookup as the
// fallbacks, all in one panel), then the officer's own activity, active
// incidents nearby and the violations they recorded most recently.
export function PoliceHome() {
  const theme = useTheme();
  const { location, isFallback } = useCurrentLocation();
  const [summary, setSummary] = useState<OfficerSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [nearbyCount, setNearbyCount] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  // Only the newest summary load may write state (focus reloads and pull-to-
  // refresh can overlap).
  const latestLoad = useRef(0);

  const loadSummary = useCallback(async () => {
    const request = ++latestLoad.current;
    try {
      const data = await getMySummary();
      if (request !== latestLoad.current) return;
      setSummary(data);
      setSummaryError(null);
    } catch (err) {
      if (request !== latestLoad.current) return;
      setSummaryError(extractErrorMessage(err));
    }
  }, []);

  const loadNearby = useCallback(async () => {
    if (!location) return;
    try {
      setNearbyCount((await listNearbyIncidents(location.lat, location.lng)).length);
    } catch {
      // A courtesy figure: leave the card in its last state.
    }
  }, [location]);

  // Reload on focus, so a violation just recorded shows up on return.
  useFocusEffect(
    useCallback(() => {
      loadSummary();
      loadNearby();
    }, [loadSummary, loadNearby]),
  );

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([loadSummary(), loadNearby()]);
    setRefreshing(false);
  }

  // A recent record lists the driver's NIC; look them up to reopen their details.
  async function openDriver(violation: RecentViolation) {
    if (openingId) return;
    setOpeningId(violation.id);
    setOpenError(null);
    try {
      const driver = await lookupDriver({ nic: violation.driver_nic });
      router.push({ pathname: '/(app)/police-driver', params: { driver: JSON.stringify(driver) } });
    } catch (err) {
      setOpenError(extractErrorMessage(err));
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <HeroScreen
        title={`${greeting()}, Officer`}
        summary="Ready to verify a driver"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.brand]} tintColor={theme.onBrand} />
        }
      >
        <ActionPanel />

        <View style={styles.section}>
          <SectionLabel text="Your activity" />
          {summary ? (
            <Card variant="raised" style={styles.statsCard} testID="police-activity">
              <Stat label="Today" value={summary.recorded_today} />
              <View style={[styles.statDivider, { backgroundColor: theme.backgroundSelected }]} />
              <Stat label="This week" value={summary.recorded_this_week} />
              <View style={[styles.statDivider, { backgroundColor: theme.backgroundSelected }]} />
              <Stat label="All time" value={summary.recorded_total} />
            </Card>
          ) : summaryError ? (
            <Banner tone="danger" text={`Couldn't load your activity: ${summaryError}`} testID="police-activity-error" />
          ) : (
            <Skeleton height={76} radius={Radius.medium} />
          )}
          <ThemedText type="small" themeColor="textSecondary">
            Violations you recorded
          </ThemedText>
        </View>

        <PressableScale
          onPress={() => router.navigate('/(app)/(tabs)/(incidents)/incidents')}
          accessibilityRole="button"
          testID="police-nearby-incidents"
          contentStyle={[styles.nearby, { backgroundColor: theme.backgroundElement, boxShadow: Shadows.card }]}
        >
          <IconTile icon="warning-outline" color={nearbyCount ? theme.warning : theme.success} />
          <View style={styles.flex}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {nearbyCount === null
                ? 'Incidents nearby'
                : nearbyCount === 0
                  ? 'No active incidents nearby'
                  : `${nearbyCount} active ${nearbyCount === 1 ? 'incident' : 'incidents'} nearby`}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {isFallback ? 'Location off: showing around Colombo' : 'Within 5 km of you'}
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
        </PressableScale>

        <View style={styles.section}>
          <SectionLabel text="Recent violations" />
          {openError ? <Banner tone="danger" text={openError} /> : null}
          {summary && summary.recent.length === 0 ? (
            <Card>
              <ThemedText themeColor="textSecondary">You haven&apos;t recorded any violations yet.</ThemedText>
            </Card>
          ) : null}
          {summary?.recent.map((violation, i) => (
            <FadeInItem key={violation.id} index={i}>
              <Card style={styles.rowCard}>
                <ListRow
                  testID={`police-recent-${violation.id}`}
                  onPress={() => openDriver(violation)}
                  accessibilityHint="Opens the driver's details"
                  leading={
                    openingId === violation.id ? (
                      <View style={styles.spinnerTile}>
                        <ActivityIndicator color={theme.primary} />
                      </View>
                    ) : (
                      <IconTile icon={VIOLATION_ICON[violation.type]} color={theme[VIOLATION_COLOR[violation.type]]} />
                    )
                  }
                  title={VIOLATION_LABEL[violation.type]}
                  value={violation.fine_amount !== null ? formatLkr(violation.fine_amount) : undefined}
                  meta={`NIC ${violation.driver_nic} · ${relativeTime(violation.confirmed_at)}`}
                  chevron
                />
              </Card>
            </FadeInItem>
          ))}
        </View>

        <Banner
          tone="info"
          text="Face matches are a guide. Confirm the driver's identity yourself when the match is uncertain."
        />
      </HeroScreen>
    </>
  );
}

// One panel for starting a verification: face scan is the primary row, QR and
// lookup sit beneath it as the fallbacks.
function ActionPanel() {
  const theme = useTheme();
  return (
    <Card variant="raised" style={[styles.panel, styles.overlap]}>
      <PressableScale
        onPress={() => openVerify('face')}
        accessibilityRole="button"
        accessibilityLabel="Scan face. Identify the driver from a photo"
        testID="police-home-face"
        contentStyle={[styles.primaryAction, { backgroundColor: theme.brand }]}
      >
        <View style={styles.primaryIcon}>
          <Ionicons name="scan-outline" size={26} color={theme.onBrand} />
        </View>
        <View style={styles.flex}>
          <ThemedText type="default" themeColor="onBrand" style={styles.bold}>
            Scan face
          </ThemedText>
          <ThemedText type="small" themeColor="onBrand" style={styles.dim} numberOfLines={1}>
            Identify the driver from a photo
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.onBrand} />
      </PressableScale>
      <View style={styles.secondaryRow}>
        <SecondaryAction mode="qr" icon="qr-code-outline" label="Scan QR" />
        <SecondaryAction mode="lookup" icon="search-outline" label="NIC / License" />
      </View>
    </Card>
  );
}

function SecondaryAction({
  mode,
  icon,
  label,
}: {
  mode: VerifyMode;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={() => openVerify(mode)}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={`police-home-${mode}`}
      style={styles.flex}
      contentStyle={[styles.secondaryAction, { backgroundColor: tint(theme.primary, 'subtle') }]}
    >
      <Ionicons name={icon} size={20} color={theme.primary} />
      <ThemedText type="smallBold" themeColor="primary" numberOfLines={1}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <ThemedText type="subtitle" style={styles.statValue}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {label}
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
  flex: { flex: 1, minWidth: 0 },
  bold: { fontWeight: 700 },
  dim: { opacity: 0.85 },
  // Lifts the action panel over the hero's lower edge.
  overlap: { marginTop: -(Spacing.four + Spacing.three) },
  panel: { padding: Spacing.three, gap: Spacing.three, borderRadius: Radius.large },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    minHeight: 72,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
  },
  primaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    // Translucent white: only used on a brand surface.
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  secondaryRow: { flexDirection: 'row', gap: Spacing.three },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
  },
  section: { gap: Spacing.two },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.5 },
  statsCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.three },
  stat: { flex: 1, alignItems: 'center', gap: Spacing.half },
  statValue: { fontVariant: ['tabular-nums'] },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  nearby: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
  },
  rowCard: { paddingVertical: 0 },
  spinnerTile: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
