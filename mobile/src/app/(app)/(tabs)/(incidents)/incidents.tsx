import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { extractErrorMessage } from '@/api/client';
import {
  clearDangerZone,
  confirmDangerZone,
  listNearbyDangerZones,
  markDangerZone,
} from '@/api/danger-zones';
import {
  clearIncident,
  confirmIncident,
  listNearbyIncidents,
  reportIncident,
} from '@/api/road-incidents';
import { IncidentsMap } from '@/components/incidents-map';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DangerZone } from '@/types/danger-zone';
import type {
  RoadIncident,
  RoadIncidentSeverity,
  RoadIncidentType,
} from '@/types/road-incident';

const INCIDENT_TYPES: RoadIncidentType[] = [
  'ACCIDENT',
  'TRAFFIC',
  'ROAD_BLOCK',
  'FLOOD',
  'CONSTRUCTION',
  'BREAKDOWN',
  'HAZARD',
  'OTHER',
];
const SEVERITIES: RoadIncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH'];
const RADIUS_OPTIONS: { label: string; value: number }[] = [
  { label: '100m', value: 100 },
  { label: '250m', value: 250 },
  { label: '500m', value: 500 },
  { label: '1km', value: 1000 },
];

// Colombo, Sri Lanka -- fallback only, used when location permission is
// denied or unavailable, so the screen still functions for a demo/preview.
const FALLBACK_LOCATION = { lat: 6.9271, lng: 79.8612 };

const SEVERITY_COLOR: Record<RoadIncidentSeverity, 'danger' | 'warning' | 'textSecondary'> = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'textSecondary',
};

const TYPE_ICON: Record<RoadIncidentType, keyof typeof Ionicons.glyphMap> = {
  ACCIDENT: 'car-sport',
  TRAFFIC: 'trail-sign',
  ROAD_BLOCK: 'hand-left',
  FLOOD: 'water',
  CONSTRUCTION: 'construct',
  BREAKDOWN: 'build',
  HAZARD: 'alert-circle',
  OTHER: 'ellipsis-horizontal-circle-outline',
};

export default function IncidentsScreen() {
  const theme = useTheme();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<RoadIncident[] | null>(null);
  const [zones, setZones] = useState<DangerZone[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zonesLoadError, setZonesLoadError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<RoadIncidentType>('HAZARD');
  const [reportSeverity, setReportSeverity] = useState<RoadIncidentSeverity>('MEDIUM');
  const [isReporting, setIsReporting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [zoneRadius, setZoneRadius] = useState(250);
  const [zoneSeverity, setZoneSeverity] = useState<RoadIncidentSeverity>('MEDIUM');
  const [zoneReason, setZoneReason] = useState('');
  const [isMarkingZone, setIsMarkingZone] = useState(false);
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) {
            setLocationNote('Location permission denied -- showing incidents near Colombo instead.');
            setLocation(FALLBACK_LOCATION);
          }
          return;
        }
        const position = await Location.getCurrentPositionAsync({});
        if (!cancelled) {
          setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        }
      } catch {
        if (!cancelled) {
          setLocationNote('Could not determine your location -- showing incidents near Colombo instead.');
          setLocation(FALLBACK_LOCATION);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadIncidents = useCallback(async (lat: number, lng: number) => {
    // allSettled, not all -- a failure in one list must not block or clear
    // the other; they load together but report their own errors.
    const [incidentsResult, zonesResult] = await Promise.allSettled([
      listNearbyIncidents(lat, lng),
      listNearbyDangerZones(lat, lng),
    ]);
    if (incidentsResult.status === 'fulfilled') {
      setIncidents(incidentsResult.value);
      setLoadError(null);
    } else {
      setLoadError(extractErrorMessage(incidentsResult.reason));
    }
    if (zonesResult.status === 'fulfilled') {
      setZones(zonesResult.value);
      setZonesLoadError(null);
    } else {
      setZonesLoadError(extractErrorMessage(zonesResult.reason));
    }
  }, []);

  useEffect(() => {
    // Fetch-on-location-change, not a state sync.
    if (location) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadIncidents(location.lat, location.lng);
    }
  }, [location, loadIncidents]);

  async function handleRefresh() {
    if (!location) return;
    setRefreshing(true);
    await loadIncidents(location.lat, location.lng);
    setRefreshing(false);
  }

  async function handleReport() {
    if (!location) return;
    setReportError(null);
    setActionMessage(null);
    setIsReporting(true);
    try {
      await reportIncident(reportType, reportSeverity, location.lat, location.lng);
      await loadIncidents(location.lat, location.lng);
      setActionMessage('Incident reported.');
    } catch (err) {
      setReportError(extractErrorMessage(err));
    } finally {
      setIsReporting(false);
    }
  }

  async function handleConfirm(id: string) {
    if (!location) return;
    setActionMessage(null);
    await confirmIncident(id);
    await loadIncidents(location.lat, location.lng);
    setActionMessage('Incident confirmed -- thanks for the update.');
  }

  async function handleClear(id: string) {
    if (!location) return;
    setActionMessage(null);
    await clearIncident(id);
    await loadIncidents(location.lat, location.lng);
    setActionMessage('Incident cleared.');
  }

  async function handleMarkZone() {
    if (!location) return;
    setZoneError(null);
    setActionMessage(null);
    setIsMarkingZone(true);
    try {
      await markDangerZone(
        location.lat,
        location.lng,
        zoneRadius,
        zoneSeverity,
        zoneReason.trim() || undefined,
      );
      await loadIncidents(location.lat, location.lng);
      setZoneReason('');
      setActionMessage('Danger zone marked.');
    } catch (err) {
      setZoneError(extractErrorMessage(err));
    } finally {
      setIsMarkingZone(false);
    }
  }

  async function handleConfirmZone(id: string) {
    if (!location) return;
    setActionMessage(null);
    await confirmDangerZone(id);
    await loadIncidents(location.lat, location.lng);
    setActionMessage('Danger zone confirmed -- thanks for the update.');
  }

  async function handleClearZone(id: string) {
    if (!location) return;
    setActionMessage(null);
    await clearDangerZone(id);
    await loadIncidents(location.lat, location.lng);
    setActionMessage('Danger zone cleared.');
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <ThemedView style={styles.form}>
        {actionMessage ? (
          <View style={styles.successRow} testID="incident-action-message">
            <Ionicons name="checkmark-circle" size={16} color={theme.success} />
            <ThemedText type="small" themeColor="success">
              {actionMessage}
            </ThemedText>
          </View>
        ) : null}

        {locationNote ? (
          <ThemedText type="small" themeColor="textSecondary" testID="location-note">
            {locationNote}
          </ThemedText>
        ) : null}

        {Platform.OS === 'web' ? (
          <ThemedText type="small" themeColor="textSecondary" testID="map-unavailable-note">
            Map view is only available on the native app -- showing the list below.
          </ThemedText>
        ) : location ? (
          <IncidentsMap center={location} incidents={incidents ?? []} zones={zones ?? []} />
        ) : null}

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Report an Incident</ThemedText>
          <View style={styles.chipRow}>
            {INCIDENT_TYPES.map((type) => (
              <Pressable
                key={type}
                onPress={() => setReportType(type)}
                style={[
                  styles.chip,
                  { backgroundColor: reportType === type ? theme.primary : theme.background },
                ]}
                testID={`type-${type}`}
              >
                <Ionicons
                  name={TYPE_ICON[type]}
                  size={14}
                  color={reportType === type ? theme.onPrimary : theme.text}
                />
                <ThemedText type="small" themeColor={reportType === type ? 'onPrimary' : 'text'}>
                  {type.replace('_', ' ')}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          <View style={styles.chipRow}>
            {SEVERITIES.map((severity) => (
              <Pressable
                key={severity}
                onPress={() => setReportSeverity(severity)}
                style={[
                  styles.chip,
                  { backgroundColor: reportSeverity === severity ? theme.primary : theme.background },
                ]}
                testID={`severity-${severity}`}
              >
                <ThemedText
                  type="small"
                  themeColor={reportSeverity === severity ? 'onPrimary' : 'text'}
                >
                  {severity}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          {reportError ? (
            <ThemedText type="small" themeColor="danger" selectable>
              {reportError}
            </ThemedText>
          ) : null}
          <Pressable
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={handleReport}
            disabled={!location || isReporting}
            testID="report-button"
          >
            <ThemedText type="smallBold" themeColor="onPrimary">
              {isReporting ? 'Reporting…' : 'Report at My Location'}
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Mark a Danger Zone</ThemedText>
          <View style={styles.chipRow}>
            {RADIUS_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setZoneRadius(option.value)}
                style={[
                  styles.chip,
                  { backgroundColor: zoneRadius === option.value ? theme.primary : theme.background },
                ]}
                testID={`zone-radius-${option.value}`}
              >
                <ThemedText
                  type="small"
                  themeColor={zoneRadius === option.value ? 'onPrimary' : 'text'}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          <View style={styles.chipRow}>
            {SEVERITIES.map((severity) => (
              <Pressable
                key={severity}
                onPress={() => setZoneSeverity(severity)}
                style={[
                  styles.chip,
                  { backgroundColor: zoneSeverity === severity ? theme.primary : theme.background },
                ]}
                testID={`zone-severity-${severity}`}
              >
                <ThemedText
                  type="small"
                  themeColor={zoneSeverity === severity ? 'onPrimary' : 'text'}
                >
                  {severity}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          <TextField
            label="Reason (optional)"
            value={zoneReason}
            onChangeText={setZoneReason}
            testID="zone-reason-input"
          />
          {zoneError ? (
            <ThemedText type="small" themeColor="danger" selectable>
              {zoneError}
            </ThemedText>
          ) : null}
          <Pressable
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={handleMarkZone}
            disabled={!location || isMarkingZone}
            testID="mark-zone-button"
          >
            <ThemedText type="smallBold" themeColor="onPrimary">
              {isMarkingZone ? 'Marking…' : 'Mark Danger Zone at My Location'}
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedText type="subtitle">Nearby Active Incidents</ThemedText>
        {loadError ? (
          <ThemedText type="small" themeColor="danger" selectable testID="incidents-error">
            {loadError}
          </ThemedText>
        ) : incidents === null ? (
          <ActivityIndicator testID="incidents-loading" />
        ) : incidents.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" testID="incidents-empty">
            No active incidents nearby.
          </ThemedText>
        ) : (
          incidents.map((incident) => (
            <ThemedView
              key={incident.id}
              type="backgroundElement"
              style={styles.card}
              testID={`incident-${incident.id}`}
            >
              <View style={styles.typeRow}>
                <Ionicons name={TYPE_ICON[incident.type]} size={16} color={theme.text} />
                <ThemedText type="smallBold">{incident.type.replace('_', ' ')}</ThemedText>
              </View>
              <ThemedText type="small" themeColor={SEVERITY_COLOR[incident.severity]}>
                {incident.severity} severity
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Confirmed by {incident.confirmation_count}{' '}
                {incident.confirmation_count === 1 ? 'driver' : 'drivers'}
              </ThemedText>
              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.button, styles.flexButton, { backgroundColor: theme.primary }]}
                  onPress={() => handleConfirm(incident.id)}
                  testID={`confirm-${incident.id}`}
                >
                  <ThemedText type="smallBold" themeColor="onPrimary">
                    Confirm
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.flexButton, { backgroundColor: theme.backgroundSelected }]}
                  onPress={() => handleClear(incident.id)}
                  testID={`clear-${incident.id}`}
                >
                  <ThemedText type="smallBold">Clear</ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          ))
        )}

        <ThemedText type="subtitle">Nearby Danger Zones</ThemedText>
        {zonesLoadError ? (
          <ThemedText type="small" themeColor="danger" selectable testID="zones-error">
            {zonesLoadError}
          </ThemedText>
        ) : zones === null ? (
          <ActivityIndicator testID="zones-loading" />
        ) : zones.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" testID="zones-empty">
            No danger zones marked nearby.
          </ThemedText>
        ) : (
          zones.map((zone) => (
            <ThemedView
              key={zone.id}
              type="backgroundElement"
              style={styles.card}
              testID={`zone-${zone.id}`}
            >
              <View style={styles.typeRow}>
                <Ionicons name="alert-circle" size={16} color={theme[SEVERITY_COLOR[zone.severity]]} />
                <ThemedText type="smallBold" themeColor={SEVERITY_COLOR[zone.severity]}>
                  {zone.severity} risk · {zone.radius_m}m radius
                </ThemedText>
              </View>
              {zone.reason ? (
                <ThemedText type="small" selectable>
                  {zone.reason}
                </ThemedText>
              ) : null}
              <ThemedText type="small" themeColor="textSecondary">
                Confirmed by {zone.confirmation_count}{' '}
                {zone.confirmation_count === 1 ? 'person' : 'people'}
              </ThemedText>
              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.button, styles.flexButton, { backgroundColor: theme.primary }]}
                  onPress={() => handleConfirmZone(zone.id)}
                  testID={`confirm-zone-${zone.id}`}
                >
                  <ThemedText type="smallBold" themeColor="onPrimary">
                    Confirm
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.flexButton, { backgroundColor: theme.backgroundSelected }]}
                  onPress={() => handleClearZone(zone.id)}
                  testID={`clear-zone-${zone.id}`}
                >
                  <ThemedText type="smallBold">Clear</ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          ))
        )}
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
    maxWidth: 800,
    gap: Spacing.three,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  flexButton: { flex: 1 },
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
});
