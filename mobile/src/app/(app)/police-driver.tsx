import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { extractErrorMessage } from '@/api/client';
import { recordViolation } from '@/api/police';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DriverSummary, ViolationRead, ViolationType } from '@/types/police';

const VIOLATION_TYPES: ViolationType[] = ['WHITE_LINE', 'SPEEDING', 'RED_LIGHT', 'DRUNK_DRIVING'];

export default function PoliceDriverScreen() {
  const theme = useTheme();
  const { driver: driverParam } = useLocalSearchParams<{ driver: string }>();
  const initialDriver: DriverSummary = JSON.parse(driverParam);

  const [driver, setDriver] = useState(initialDriver);
  const [violationType, setViolationType] = useState<ViolationType>('WHITE_LINE');
  const [evidenceRef, setEvidenceRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleRecordViolation() {
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const result = await recordViolation({
        driverId: driver.driver_id,
        type: violationType,
        evidenceRef: evidenceRef || undefined,
      });
      setDriver((prev) => ({
        ...prev,
        points: result.driver_points,
        license_status: result.license_status,
        violations: [result.violation, ...prev.violations],
      }));
      setEvidenceRef('');
      setSuccessMessage(
        `Recorded ${result.violation.type} -- ${result.violation.points_deducted} points, ` +
          `fine LKR ${result.fine.amount}.${
            result.license_status === 'SUSPENDED' ? ' License is now SUSPENDED.' : ''
          }`,
      );
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <ThemedView style={styles.form}>
        <ThemedText type="title">Driver Details</ThemedText>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold" selectable>
            {driver.email}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" selectable>
            NIC: {driver.nic}
          </ThemedText>
          {driver.license_no ? (
            <>
              <ThemedText type="small" selectable>
                License: {driver.license_no}
              </ThemedText>
              <ThemedText
                type="smallBold"
                themeColor={driver.license_status === 'ACTIVE' ? 'primary' : 'danger'}
                testID="driver-license-status"
              >
                {driver.license_status} · {driver.points} pts
              </ThemedText>
            </>
          ) : (
            <ThemedText type="small" themeColor="danger">
              No license issued -- a violation cannot be recorded
            </ThemedText>
          )}
        </ThemedView>

        <ThemedText type="subtitle">Violation History</ThemedText>
        {driver.violations.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No violations on record.
          </ThemedText>
        ) : (
          driver.violations.map((violation: ViolationRead) => (
            <ThemedView key={violation.id} type="backgroundElement" style={styles.violationCard}>
              <ThemedText type="smallBold">{violation.type}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {new Date(violation.confirmed_at).toLocaleString()} ·{' '}
                {violation.points_deducted} pts
              </ThemedText>
              {violation.evidence_ref ? (
                <ThemedText type="small" selectable>
                  {violation.evidence_ref}
                </ThemedText>
              ) : null}
            </ThemedView>
          ))
        )}

        {driver.license_no ? (
          <ThemedView style={styles.recordSection}>
            <ThemedText type="subtitle">Record Violation</ThemedText>
            <View style={styles.typeRow}>
              {VIOLATION_TYPES.map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setViolationType(type)}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor:
                        violationType === type ? theme.primary : theme.backgroundElement,
                    },
                  ]}
                  testID={`violation-type-${type}`}
                >
                  <ThemedText
                    type="small"
                    themeColor={violationType === type ? 'onPrimary' : 'text'}
                  >
                    {type.replace('_', ' ')}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <TextField
              label="Evidence reference (optional)"
              value={evidenceRef}
              onChangeText={setEvidenceRef}
              testID="violation-evidence-ref"
            />

            {error ? (
              <ThemedText type="small" themeColor="danger" selectable testID="record-violation-error">
                {error}
              </ThemedText>
            ) : null}
            {successMessage ? (
              <ThemedText type="small" themeColor="primary" selectable testID="record-violation-success">
                {successMessage}
              </ThemedText>
            ) : null}

            <Pressable
              style={[
                styles.button,
                { backgroundColor: theme.danger },
                isSubmitting && styles.buttonDisabled,
              ]}
              onPress={handleRecordViolation}
              disabled={isSubmitting}
              testID="record-violation-submit"
            >
              <ThemedText type="smallBold" themeColor="onPrimary">
                {isSubmitting ? 'Recording…' : 'Record Violation'}
              </ThemedText>
            </Pressable>
          </ThemedView>
        ) : null}
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
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  violationCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  recordSection: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  typeChip: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
});
