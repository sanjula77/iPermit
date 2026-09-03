import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getMyAppeals, submitAppeal } from '@/api/appeals';
import { extractErrorMessage } from '@/api/client';
import { getMyFines, payFine } from '@/api/fines';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Appeal, FineWithViolation, PaymentMethod } from '@/types/fine';

const PAYMENT_METHODS: PaymentMethod[] = ['CARD', 'BANK', 'WALLET'];

export default function FinesScreen() {
  const [fines, setFines] = useState<FineWithViolation[] | null>(null);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [finesData, appealsData] = await Promise.all([getMyFines(), getMyAppeals()]);
      setFines(finesData);
      setAppeals(appealsData);
    } catch (err) {
      setLoadError(extractErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount, not a state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const outstandingTotal = (fines ?? [])
    .filter((f) => f.status === 'UNPAID')
    .reduce((sum, f) => sum + f.amount, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <ThemedView style={styles.form}>
        <ThemedText type="title">Fines</ThemedText>
        <ThemedText type="subtitle" testID="outstanding-total">
          Outstanding: LKR {outstandingTotal}
        </ThemedText>

        {loadError ? (
          <ThemedText type="small" themeColor="danger" selectable testID="fines-error">
            {loadError}
          </ThemedText>
        ) : fines === null ? (
          <ActivityIndicator testID="fines-loading" />
        ) : fines.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" testID="fines-empty">
            No fines on record.
          </ThemedText>
        ) : (
          fines.map((fine) => (
            <FineCard
              key={fine.id}
              fine={fine}
              appeal={appeals.find((a) => a.fine.id === fine.id) ?? null}
              onChanged={load}
            />
          ))
        )}
      </ThemedView>
    </ScrollView>
  );
}

function FineCard({
  fine,
  appeal,
  onChanged,
}: {
  fine: FineWithViolation;
  appeal: Appeal | null;
  onChanged: () => void;
}) {
  const theme = useTheme();
  const [mode, setMode] = useState<'none' | 'pay' | 'appeal'>('none');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD');
  const [appealReason, setAppealReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setError(null);
    setIsSubmitting(true);
    try {
      await payFine(fine.id, paymentMethod);
      setMode('none');
      onChanged();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAppeal() {
    if (!appealReason.trim()) {
      setError('Please explain why you are appealing this fine.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await submitAppeal(fine.id, appealReason.trim());
      setMode('none');
      setAppealReason('');
      onChanged();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  const canActOnFine = fine.status === 'UNPAID' && (!appeal || appeal.status !== 'PENDING');

  return (
    <ThemedView type="backgroundElement" style={styles.card} testID={`fine-${fine.id}`}>
      <ThemedText type="smallBold">{fine.violation.type.replace('_', ' ')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {new Date(fine.violation.confirmed_at).toLocaleDateString()} · {fine.violation.points_deducted} pts
      </ThemedText>
      <ThemedText type="smallBold">LKR {fine.amount}</ThemedText>
      <ThemedText
        type="small"
        themeColor={
          fine.status === 'UNPAID' ? 'danger' : fine.status === 'PAID' ? 'primary' : 'textSecondary'
        }
        testID="fine-status"
      >
        {fine.status}
        {fine.status === 'PAID' && fine.payment_method ? ` via ${fine.payment_method}` : ''}
      </ThemedText>

      {appeal ? (
        <ThemedText type="small" themeColor="textSecondary" testID="fine-appeal-status">
          Appeal: {appeal.status}
        </ThemedText>
      ) : null}

      {error ? (
        <ThemedText type="small" themeColor="danger" selectable>
          {error}
        </ThemedText>
      ) : null}

      {canActOnFine ? (
        mode === 'pay' ? (
          <View style={styles.actionPanel}>
            <View style={styles.methodRow}>
              {PAYMENT_METHODS.map((method) => (
                <Pressable
                  key={method}
                  onPress={() => setPaymentMethod(method)}
                  style={[
                    styles.methodChip,
                    { backgroundColor: paymentMethod === method ? theme.primary : theme.background },
                  ]}
                  testID={`pay-method-${method}`}
                >
                  <ThemedText
                    type="small"
                    themeColor={paymentMethod === method ? 'onPrimary' : 'text'}
                  >
                    {method}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[styles.button, { backgroundColor: theme.primary }]}
              onPress={handlePay}
              disabled={isSubmitting}
              testID="confirm-pay-button"
            >
              <ThemedText type="smallBold" themeColor="onPrimary">
                {isSubmitting ? 'Paying…' : 'Confirm Payment'}
              </ThemedText>
            </Pressable>
          </View>
        ) : mode === 'appeal' ? (
          <View style={styles.actionPanel}>
            <TextField
              label="Reason for appeal"
              value={appealReason}
              onChangeText={setAppealReason}
              multiline
              testID="appeal-reason-input"
            />
            <Pressable
              style={[styles.button, { backgroundColor: theme.primary }]}
              onPress={handleAppeal}
              disabled={isSubmitting}
              testID="confirm-appeal-button"
            >
              <ThemedText type="smallBold" themeColor="onPrimary">
                {isSubmitting ? 'Submitting…' : 'Submit Appeal'}
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.actionsRow}>
            <Pressable
              style={[styles.button, styles.flexButton, { backgroundColor: theme.primary }]}
              onPress={() => setMode('pay')}
              testID={`pay-button-${fine.id}`}
            >
              <ThemedText type="smallBold" themeColor="onPrimary">
                Pay
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.button, styles.flexButton, { backgroundColor: theme.backgroundSelected }]}
              onPress={() => setMode('appeal')}
              testID={`appeal-button-${fine.id}`}
            >
              <ThemedText type="smallBold">Appeal</ThemedText>
            </Pressable>
          </View>
        )
      ) : null}
    </ThemedView>
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
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actionPanel: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  methodRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  methodChip: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  flexButton: { flex: 1 },
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
});
