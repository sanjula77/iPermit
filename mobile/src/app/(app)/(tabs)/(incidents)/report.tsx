import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { extractErrorMessage } from '@/api/client';
import { markDangerZone } from '@/api/danger-zones';
import { reportIncident } from '@/api/road-incidents';
import { Button } from '@/components/button';
import { SegmentedControl } from '@/components/segmented-control';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  INCIDENT_ICON,
  INCIDENT_LABEL,
  INCIDENT_TYPES,
  SEVERITIES,
  SEVERITY_LABEL,
  ZONE_RADIUS_OPTIONS,
} from '@/constants/incidents';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useTheme } from '@/hooks/use-theme';
import type { RoadIncidentSeverity, RoadIncidentType } from '@/types/road-incident';

type Kind = 'incident' | 'zone';

const SEVERITY_OPTIONS = SEVERITIES.map((s) => ({ label: SEVERITY_LABEL[s], value: s }));

export default function ReportScreen() {
  const theme = useTheme();
  // A report records where it happened, so the Colombo fallback must never be
  // submitted as the driver's position.
  const { location, isFallback } = useCurrentLocation();
  const [kind, setKind] = useState<Kind>('incident');
  const [incidentType, setIncidentType] = useState<RoadIncidentType | null>(null);
  const [severity, setSeverity] = useState<RoadIncidentSeverity>('MEDIUM');
  const [radius, setRadius] = useState(250);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Blocks a same-frame double tap before isSubmitting has re-rendered.
  const submittingRef = useRef(false);

  const canSubmit =
    !!location && !isFallback && !isSubmitting && (kind === 'zone' || incidentType !== null);

  async function handleSubmit() {
    if (!location || isFallback || submittingRef.current) return;
    if (kind === 'incident' && !incidentType) return;
    submittingRef.current = true;
    setError(null);
    setIsSubmitting(true);
    try {
      if (kind === 'incident' && incidentType) {
        await reportIncident(incidentType, severity, location.lat, location.lng);
      } else {
        await markDangerZone(location.lat, location.lng, radius, severity, reason.trim() || undefined);
      }
      // Return to the list (which reloads on focus) and tell it what was sent,
      // so it can confirm the report.
      router.navigate({
        pathname: '/(app)/(tabs)/(incidents)/incidents',
        params: { reported: kind },
      });
    } catch (err) {
      setError(extractErrorMessage(err));
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
      keyboardShouldPersistTaps="handled"
    >
      <ThemedView style={styles.form}>
        <SegmentedControl<Kind>
          testID="report-kind"
          value={kind}
          onChange={(next) => {
            setKind(next);
            setError(null);
          }}
          options={[
            { label: 'Incident', value: 'incident' },
            { label: 'Danger zone', value: 'zone' },
          ]}
        />

        <ThemedText themeColor="textSecondary">
          {kind === 'incident'
            ? 'Warn nearby drivers about something happening on the road right now.'
            : 'Mark a stretch of road that is dangerous, such as a sharp bend or an accident-prone junction.'}
        </ThemedText>

        {kind === 'incident' ? (
          <View style={styles.section}>
            <SectionLabel text="What happened?" />
            <View style={styles.typeGrid} accessibilityRole="radiogroup">
              {INCIDENT_TYPES.map((type) => {
                const selected = incidentType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setIncidentType(type)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={INCIDENT_LABEL[type]}
                    testID={`type-${type}`}
                    style={({ pressed }) => [
                      styles.typeTile,
                      {
                        backgroundColor: selected ? `${theme.primary}1F` : theme.backgroundElement,
                        borderColor: selected ? theme.primary : 'transparent',
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Ionicons name={INCIDENT_ICON[type]} size={22} color={selected ? theme.primary : theme.text} />
                    <ThemedText type="smallBold" themeColor={selected ? 'primary' : 'text'}>
                      {INCIDENT_LABEL[type]}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <SectionLabel text="Area size" />
            <SegmentedControl<number>
              testID="zone-radius"
              value={radius}
              onChange={setRadius}
              options={ZONE_RADIUS_OPTIONS}
            />
          </View>
        )}

        <View style={styles.section}>
          <SectionLabel text="Severity" />
          <SegmentedControl<RoadIncidentSeverity>
            testID={kind === 'incident' ? 'severity' : 'zone-severity'}
            value={severity}
            onChange={setSeverity}
            options={SEVERITY_OPTIONS}
          />
        </View>

        {kind === 'zone' ? (
          <TextField
            label="Reason (optional)"
            placeholder="e.g. Sharp bend with poor visibility"
            value={reason}
            onChangeText={setReason}
            autoCapitalize="sentences"
            autoCorrect
            testID="zone-reason-input"
          />
        ) : null}

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={18} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.locationText}>
            {!location
              ? 'Finding your location…'
              : isFallback
                ? 'Turn on location access to report from where you are.'
                : 'Uses your current location.'}
          </ThemedText>
        </View>

        {error ? (
          <ThemedText type="small" themeColor="danger" selectable accessibilityLiveRegion="polite">
            {error}
          </ThemedText>
        ) : null}

        <Button
          onPress={handleSubmit}
          disabled={!canSubmit}
          testID={kind === 'incident' ? 'report-button' : 'mark-zone-button'}
        >
          <Ionicons name="paper-plane-outline" size={18} color={theme.onPrimary} />
          <ThemedText type="smallBold" themeColor="onPrimary">
            {isSubmitting ? 'Sending…' : kind === 'incident' ? 'Report incident' : 'Mark danger zone'}
          </ThemedText>
        </Button>
      </ThemedView>
    </ScrollView>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
      {text}
    </ThemedText>
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
  section: { gap: Spacing.two },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderWidth: 2,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  locationText: { flex: 1 },
});
