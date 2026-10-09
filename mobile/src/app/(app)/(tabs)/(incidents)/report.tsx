import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { extractErrorMessage } from '@/api/client';
import { markDangerZone } from '@/api/danger-zones';
import { reportIncident, uploadIncidentPhoto } from '@/api/road-incidents';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { LocationPicker } from '@/components/location-picker';
import { PressableScale } from '@/components/pressable-scale';
import { SegmentedControl } from '@/components/segmented-control';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ScreenScroll } from '@/components/screen-scroll';
import {
  INCIDENT_ICON,
  INCIDENT_LABEL,
  INCIDENT_TYPES,
  SEVERITIES,
  SEVERITY_LABEL,
  ZONE_RADIUS_OPTIONS,
} from '@/constants/incidents';
import { Radius, Shadows, Spacing, tint } from '@/constants/theme';
import { useCurrentLocation, type LatLng } from '@/hooks/use-current-location';
import { useTheme } from '@/hooks/use-theme';
import { pickImageFromLibrary, takePhoto, type PickedFile } from '@/lib/file-upload';
import type { RoadIncidentSeverity, RoadIncidentType } from '@/types/road-incident';

type Kind = 'incident' | 'zone';

const SEVERITY_OPTIONS = SEVERITIES.map((s) => ({ label: SEVERITY_LABEL[s], value: s }));

export default function ReportScreen() {
  const theme = useTheme();
  // A report records where it happened. The place is the point the user picked
  // on the map, or else their real position -- never the Colombo fallback.
  const { location, isFallback } = useCurrentLocation();
  const [picked, setPicked] = useState<LatLng | null>(null);
  const userLocation = location && !isFallback ? location : null;
  const point = picked ?? userLocation;
  const [kind, setKind] = useState<Kind>('incident');
  const [incidentType, setIncidentType] = useState<RoadIncidentType | null>(null);
  const [severity, setSeverity] = useState<RoadIncidentSeverity>('MEDIUM');
  const [radius, setRadius] = useState(250);
  const [reason, setReason] = useState('');
  const [photo, setPhoto] = useState<PickedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Blocks a same-frame double tap before isSubmitting has re-rendered.
  const submittingRef = useRef(false);

  const canSubmit =
    !!point && !isSubmitting && (kind === 'zone' || incidentType !== null);

  async function addPhoto(source: 'camera' | 'library') {
    setError(null);
    try {
      const picked = await (source === 'camera'
        ? takePhoto('incident.jpg')
        : pickImageFromLibrary('incident.jpg'));
      if (picked) setPhoto(picked);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  async function handleSubmit() {
    if (!point || submittingRef.current) return;
    if (kind === 'incident' && !incidentType) return;
    submittingRef.current = true;
    setError(null);
    setIsSubmitting(true);
    let photoFailed = false;
    try {
      if (kind === 'incident' && incidentType) {
        const incident = await reportIncident(incidentType, severity, point.lat, point.lng);
        if (photo) {
          // The report stands even if the photo can't be sent; the list says so.
          try {
            await uploadIncidentPhoto(incident.id, photo);
          } catch {
            photoFailed = true;
          }
        }
      } else {
        await markDangerZone(point.lat, point.lng, radius, severity, reason.trim() || undefined);
      }
      // Return to the list (which reloads on focus) and tell it what was sent,
      // so it can confirm the report.
      router.navigate({
        pathname: '/(app)/(tabs)/(incidents)/incidents',
        params: photoFailed ? { reported: kind, photoFailed: '1' } : { reported: kind },
      });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <ScreenScroll
      keyboardShouldPersistTaps="handled"
    >
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
                <PressableScale
                  key={type}
                  onPress={() => setIncidentType(type)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={INCIDENT_LABEL[type]}
                  testID={`type-${type}`}
                  style={styles.typeCell}
                  contentStyle={[
                    styles.typeTile,
                    selected
                      ? { backgroundColor: tint(theme.primary), borderColor: theme.primary }
                      : { backgroundColor: theme.backgroundElement, borderColor: 'transparent', boxShadow: Shadows.card },
                  ]}
                >
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={18} color={theme.primary} style={styles.typeCheck} />
                  ) : null}
                  <Ionicons name={INCIDENT_ICON[type]} size={22} color={selected ? theme.primary : theme.text} />
                  <ThemedText
                    type="smallBold"
                    themeColor={selected ? 'primary' : 'text'}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    style={styles.typeLabel}
                  >
                    {INCIDENT_LABEL[type]}
                  </ThemedText>
                </PressableScale>
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

      {kind === 'incident' ? (
        <View style={styles.section}>
          <SectionLabel text="Photo (optional)" />
          {photo ? (
            <View style={[styles.photoPreview, { backgroundColor: theme.backgroundSelected }]}>
              <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <Pressable
                onPress={() => setPhoto(null)}
                testID="remove-photo"
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                hitSlop={8}
                style={styles.photoRemove}
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : (
            <View style={styles.photoButtons}>
              <PhotoButton icon="camera-outline" label="Take photo" onPress={() => addPhoto('camera')} testID="take-photo" />
              <PhotoButton icon="image-outline" label="Choose photo" onPress={() => addPhoto('library')} testID="choose-photo" />
            </View>
          )}
          <ThemedText type="small" themeColor="textSecondary">
            Other drivers can see it while the incident is active. It is deleted when the incident is cleared or expires.
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionLabel text="Where?" />
        {location ? (
          <LocationPicker start={location} userLocation={userLocation} onPick={setPicked} />
        ) : null}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={18} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.locationText} testID="report-location-status">
            {!location
              ? 'Finding your location…'
              : picked
                ? 'Using the place under the pin. Drag the map to adjust it.'
                : userLocation
                  ? 'Using your current location. Drag the map to choose another place.'
                  : 'Location is off. Drag the map to put the pin where it happened.'}
          </ThemedText>
        </View>
      </View>

      {error ? <Banner tone="danger" text={error} testID="report-error" /> : null}

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
    </ScreenScroll>
  );
}

function PhotoButton({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.photoButton,
        { borderColor: theme.primary, backgroundColor: tint(theme.primary, 'subtle'), opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={icon} size={22} color={theme.primary} />
      <ThemedText type="smallBold" themeColor="primary">
        {label}
      </ThemedText>
    </Pressable>
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
  // Two columns: half the row minus half the gap.
  typeCell: { flexBasis: '48%', flexGrow: 1, minWidth: 0 },
  typeTile: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderWidth: 2,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
  },
  typeLabel: { maxWidth: '100%' },
  typeCheck: { position: 'absolute', top: Spacing.one, right: Spacing.one },
  photoButtons: { flexDirection: 'row', gap: Spacing.two },
  photoButton: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: Radius.small,
    borderCurve: 'continuous',
  },
  photoPreview: {
    height: 180,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  photoRemove: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  locationText: { flex: 1 },
});
