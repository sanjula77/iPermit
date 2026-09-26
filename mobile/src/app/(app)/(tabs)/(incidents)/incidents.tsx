import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { extractErrorMessage } from '@/api/client';
import { clearDangerZone, confirmDangerZone, listNearbyDangerZones } from '@/api/danger-zones';
import { clearIncident, confirmIncident, listNearbyIncidents } from '@/api/road-incidents';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { IncidentsMap } from '@/components/incidents-map';
import { ScreenState } from '@/components/screen-state';
import { SegmentedControl } from '@/components/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { INCIDENT_ICON, INCIDENT_LABEL, SEVERITY_LABEL } from '@/constants/incidents';
import { MaxContentWidth, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useCurrentLocation, type LatLng } from '@/hooks/use-current-location';
import { useTheme } from '@/hooks/use-theme';
import { relativeTime } from '@/lib/relative-time';
import type { DangerZone } from '@/types/danger-zone';
import type { RoadIncident, RoadIncidentSeverity } from '@/types/road-incident';

type Tab = 'incidents' | 'zones';

const TONE_COLOR: Record<RoadIncidentSeverity, ThemeColor> = {
  LOW: 'textSecondary',
  MEDIUM: 'warning',
  HIGH: 'danger',
};

export default function IncidentsScreen() {
  const theme = useTheme();
  const { location, note: locationNote } = useCurrentLocation();
  const [tab, setTab] = useState<Tab>('incidents');
  const [incidents, setIncidents] = useState<RoadIncident[] | null>(null);
  const [zones, setZones] = useState<DangerZone[] | null>(null);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);
  const [zonesError, setZonesError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [focus, setFocus] = useState<LatLng | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  // Only the newest load may write state (focus reloads and pull-to-refresh
  // can overlap).
  const latestLoad = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  // Rows with an action in flight: the server counts every Confirm call, so a
  // double tap must not send two.
  const busyIds = useRef(new Set<string>());
  const { reported } = useLocalSearchParams<{ reported?: 'incident' | 'zone' }>();

  useEffect(() => {
    // Set by the Report screen on success; show it once, then clear the param.
    if (reported) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotice({ kind: 'success', text: reported === 'zone' ? 'Danger zone marked.' : 'Incident reported.' });
      setTab(reported === 'zone' ? 'zones' : 'incidents');
      router.setParams({ reported: undefined });
    }
  }, [reported]);

  function showOnMap(point: LatLng) {
    setFocus(point);
    // The map is at the top of the scroll view; bring it into view.
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  const load = useCallback(async (at: LatLng) => {
    const request = ++latestLoad.current;
    // allSettled, not all -- a failure in one list must not block or clear
    // the other; they load together but report their own errors.
    const [incidentsResult, zonesResult] = await Promise.allSettled([
      listNearbyIncidents(at.lat, at.lng),
      listNearbyDangerZones(at.lat, at.lng),
    ]);
    if (request !== latestLoad.current) return;
    if (incidentsResult.status === 'fulfilled') {
      setIncidents(incidentsResult.value);
      setIncidentsError(null);
    } else {
      setIncidentsError(extractErrorMessage(incidentsResult.reason));
    }
    if (zonesResult.status === 'fulfilled') {
      setZones(zonesResult.value);
      setZonesError(null);
    } else {
      setZonesError(extractErrorMessage(zonesResult.reason));
    }
  }, []);

  // Reload on focus too, so a report made on the Report screen shows up on return.
  useFocusEffect(
    useCallback(() => {
      if (location) load(location);
    }, [location, load]),
  );

  async function handleRefresh() {
    if (!location) return;
    setRefreshing(true);
    await load(location);
    setRefreshing(false);
  }

  async function runAction(id: string, action: () => Promise<unknown>, success: string) {
    if (!location || busyIds.current.has(id)) return;
    busyIds.current.add(id);
    setNotice(null);
    try {
      await action();
      await load(location);
      setNotice({ kind: 'success', text: success });
    } catch (err) {
      setNotice({ kind: 'error', text: extractErrorMessage(err) });
    } finally {
      busyIds.current.delete(id);
    }
  }

  function confirmClear(id: string, what: string, clear: () => Promise<unknown>) {
    // Clearing removes it for every driver, so ask first.
    const title = `Mark ${what.toLowerCase()} as cleared?`;
    const message = 'It will be removed from the map for everyone.';
    if (Platform.OS === 'web') {
      // react-native-web's Alert.alert is a no-op.
      if (window.confirm(`${title}\n${message}`)) runAction(id, clear, `${what} cleared.`);
      return;
    }
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark cleared', style: 'destructive', onPress: () => runAction(id, clear, `${what} cleared.`) },
    ]);
  }

  const list = tab === 'incidents' ? incidents : zones;
  const listError = tab === 'incidents' ? incidentsError : zonesError;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      ref={scrollRef}
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/(app)/(tabs)/(incidents)/report')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Report an incident or danger zone"
              testID="open-report"
              style={styles.headerButton}
            >
              <Ionicons name="add-circle" size={22} color={theme.primary} />
              <ThemedText type="smallBold" themeColor="primary">
                Report
              </ThemedText>
            </Pressable>
          ),
        }}
      />
      <ThemedView style={styles.form}>
        {locationNote ? <Banner kind="info" text={locationNote} testID="location-note" /> : null}
        {notice ? <Banner kind={notice.kind} text={notice.text} testID="incident-action-message" /> : null}

        {Platform.OS === 'web' ? (
          <ThemedText type="small" themeColor="textSecondary" testID="map-unavailable-note">
            Map view is only available on the native app.
          </ThemedText>
        ) : location ? (
          <IncidentsMap center={location} incidents={incidents ?? []} zones={zones ?? []} focus={focus} />
        ) : (
          <View style={[styles.mapPlaceholder, { backgroundColor: theme.backgroundElement }]}>
            <ScreenState />
          </View>
        )}

        <SegmentedControl<Tab>
          testID="incidents-tab"
          value={tab}
          onChange={setTab}
          options={[
            { label: incidents ? `Incidents (${incidents.length})` : 'Incidents', value: 'incidents' },
            { label: zones ? `Danger zones (${zones.length})` : 'Danger zones', value: 'zones' },
          ]}
        />

        {list === null ? (
          <ScreenState
            error={location ? listError : null}
            onRetry={handleRefresh}
            testID={tab === 'incidents' ? 'incidents' : 'zones'}
          />
        ) : list.length === 0 ? (
          <EmptyState
            testID={tab === 'incidents' ? 'incidents-empty' : 'zones-empty'}
            icon={tab === 'incidents' ? 'checkmark-done-circle-outline' : 'shield-checkmark-outline'}
            title={tab === 'incidents' ? 'No incidents nearby' : 'No danger zones nearby'}
            message={
              tab === 'incidents'
                ? 'Seen an accident, flood or road block? Tap Report to warn other drivers.'
                : 'Know a dangerous stretch of road? Tap Report to mark it for others.'
            }
          />
        ) : (
          <>
            {listError ? (
              <ThemedText type="small" themeColor="danger" selectable>
                Couldn&apos;t refresh: {listError}
              </ThemedText>
            ) : null}
            <Card style={styles.list}>
              {tab === 'incidents'
                ? (list as RoadIncident[]).map((incident, i) => (
                    <Fragment key={incident.id}>
                      {i > 0 ? <Separator /> : null}
                      <ReportRow
                        testID={`incident-${incident.id}`}
                        icon={INCIDENT_ICON[incident.type]}
                        severity={incident.severity}
                        title={INCIDENT_LABEL[incident.type]}
                        detail={`${SEVERITY_LABEL[incident.severity]} · ${confirmations(incident.confirmation_count)} · ${relativeTime(incident.created_at)}`}
                        onPress={() => showOnMap({ lat: incident.lat, lng: incident.lng })}
                        onConfirm={() =>
                          runAction(incident.id, () => confirmIncident(incident.id), 'Incident confirmed. Thanks for the update.')
                        }
                        onClear={() => confirmClear(incident.id, 'Incident', () => clearIncident(incident.id))}
                        confirmTestID={`confirm-${incident.id}`}
                        clearTestID={`clear-${incident.id}`}
                      />
                    </Fragment>
                  ))
                : (list as DangerZone[]).map((zone, i) => (
                    <Fragment key={zone.id}>
                      {i > 0 ? <Separator /> : null}
                      <ReportRow
                        testID={`zone-${zone.id}`}
                        icon="warning"
                        severity={zone.severity}
                        title={zone.reason || `${SEVERITY_LABEL[zone.severity]} risk area`}
                        detail={`${SEVERITY_LABEL[zone.severity]} · ${formatRadius(zone.radius_m)} · ${confirmations(zone.confirmation_count)}`}
                        onPress={() => showOnMap({ lat: zone.lat, lng: zone.lng })}
                        onConfirm={() =>
                          runAction(zone.id, () => confirmDangerZone(zone.id), 'Danger zone confirmed. Thanks for the update.')
                        }
                        onClear={() => confirmClear(zone.id, 'Danger zone', () => clearDangerZone(zone.id))}
                        confirmTestID={`confirm-zone-${zone.id}`}
                        clearTestID={`clear-zone-${zone.id}`}
                      />
                    </Fragment>
                  ))}
            </Card>
          </>
        )}
      </ThemedView>
    </ScrollView>
  );
}

function confirmations(count: number): string {
  return `${count} ${count === 1 ? 'confirmation' : 'confirmations'}`;
}

function formatRadius(meters: number): string {
  return meters >= 1000 ? `${meters / 1000} km radius` : `${meters} m radius`;
}

function Separator() {
  const theme = useTheme();
  return <View style={[styles.separator, { backgroundColor: theme.backgroundSelected }]} />;
}

function Banner({ kind, text, testID }: { kind: 'success' | 'error' | 'info'; text: string; testID?: string }) {
  const theme = useTheme();
  const colorKey: ThemeColor = kind === 'success' ? 'success' : kind === 'error' ? 'danger' : 'textSecondary';
  const icon = kind === 'success' ? 'checkmark-circle' : kind === 'error' ? 'alert-circle' : 'information-circle';
  return (
    <View
      style={[styles.banner, { backgroundColor: `${theme[colorKey]}14` }]}
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      <Ionicons name={icon} size={18} color={theme[colorKey]} />
      <ThemedText type="small" themeColor={colorKey} selectable style={styles.bannerText}>
        {text}
      </ThemedText>
    </View>
  );
}

function ReportRow({
  icon,
  severity,
  title,
  detail,
  onPress,
  onConfirm,
  onClear,
  testID,
  confirmTestID,
  clearTestID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  severity: RoadIncidentSeverity;
  title: string;
  detail: string;
  onPress: () => void;
  onConfirm: () => void;
  onClear: () => void;
  testID: string;
  confirmTestID: string;
  clearTestID: string;
}) {
  const theme = useTheme();
  const color = theme[TONE_COLOR[severity]];

  return (
    <View style={styles.row} testID={testID}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${detail}. Show on map`}
        style={({ pressed }) => [styles.rowMain, { opacity: pressed ? 0.6 : 1 }]}
      >
        <View style={[styles.iconCircle, { backgroundColor: `${color}1F` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.rowText}>
          <ThemedText numberOfLines={2}>{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {detail}
          </ThemedText>
        </View>
      </Pressable>
      <View style={styles.rowActions}>
        <Pressable
          onPress={onConfirm}
          testID={confirmTestID}
          accessibilityRole="button"
          accessibilityLabel={`Confirm ${title} is still there`}
          style={({ pressed }) => [styles.smallButton, { backgroundColor: theme.background, opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="thumbs-up-outline" size={16} color={theme.primary} />
          <ThemedText type="smallBold" themeColor="primary">
            Confirm
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={onClear}
          testID={clearTestID}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${title} as cleared`}
          style={({ pressed }) => [styles.smallButton, { backgroundColor: theme.background, opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="checkmark-done-outline" size={16} color={theme.textSecondary} />
          <ThemedText type="smallBold" themeColor="textSecondary">
            Clear
          </ThemedText>
        </Pressable>
      </View>
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
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  mapPlaceholder: {
    height: 280,
    borderRadius: Radius.medium,
    justifyContent: 'center',
  },
  banner: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
  },
  bannerText: { flex: 1 },
  list: {
    paddingVertical: 0,
    gap: 0,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  rowActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingLeft: 40 + Spacing.three,
  },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
  },
});
