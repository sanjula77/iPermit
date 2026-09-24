import { Ionicons } from '@expo/vector-icons';
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
import type { Appeal, FineStatus, FineWithViolation, PaymentMethod } from '@/types/fine';
import type { ViolationType } from '@/types/police';

const PAYMENT_METHODS: PaymentMethod[] = ['CARD', 'BANK', 'WALLET'];

const VIOLATION_ICON: Record<ViolationType, keyof typeof Ionicons.glyphMap> = {
  WHITE_LINE: 'remove-circle-outline',
  SPEEDING: 'speedometer-outline',
  RED_LIGHT: 'stop-circle-outline',
  DRUNK_DRIVING: 'alert-circle',
};

const STATUS_ICON: Record<FineStatus, keyof typeof Ionicons.glyphMap> = {
  UNPAID: 'time-outline',
  PAID: 'checkmark-circle',
  REVERSED: 'arrow-undo-circle',
};

const PAYMENT_METHOD_ICON: Record<PaymentMethod, keyof typeof Ionicons.glyphMap> = {
  CARD: 'card-outline',
  BANK: 'business-outline',
  WALLET: 'wallet-outline',
};

export default function FinesScreen() {
  const theme = useTheme();
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
  const isAllClear = fines !== null && outstandingTotal === 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <ThemedView style={styles.form}>
        <ThemedView
          type="backgroundElement"
          style={[
            styles.summaryCard,
            { borderColor: isAllClear ? theme.success : theme.danger },
          ]}
        >
          <Ionicons
            name={isAllClear ? 'checkmark-circle' : 'alert-circle'}
            size={28}
            color={isAllClear ? theme.success : theme.danger}
          />
          <View style={styles.summaryText}>
            <ThemedText type="small" themeColor="textSecondary">
              Outstanding Balance
            </ThemedText>
            <ThemedText
              type="subtitle"
              themeColor={isAllClear ? 'success' : 'danger'}
              testID="outstanding-total"
            >
              LKR {outstandingTotal.toLocaleString()}
            </ThemedText>
          </View>
        </ThemedView>

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
  const [justPaid, setJustPaid] = useState(false);

  async function handlePay() {
    setError(null);
    setIsSubmitting(true);
    try {
      await payFine(fine.id, paymentMethod);
      setMode('none');
      setJustPaid(true);
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
  const statusColor =
    fine.status === 'UNPAID' ? 'danger' : fine.status === 'PAID' ? 'primary' : 'textSecondary';

  return (
    <ThemedView type="backgroundElement" style={styles.card} testID={`fine-${fine.id}`}>
      <View style={styles.headerRow}>
        <Ionicons name={VIOLATION_ICON[fine.violation.type]} size={16} color={theme.text} />
        <ThemedText type="smallBold">{fine.violation.type.replace('_', ' ')}</ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {new Date(fine.violation.confirmed_at).toLocaleDateString()} · {fine.violation.points_deducted} pts
      </ThemedText>
      <ThemedText type="smallBold">LKR {fine.amount.toLocaleString()}</ThemedText>
      <View style={styles.headerRow}>
        <Ionicons name={STATUS_ICON[fine.status]} size={14} color={theme[statusColor]} />
        <ThemedText type="small" themeColor={statusColor} testID="fine-status">
          {fine.status}
          {fine.status === 'PAID' && fine.payment_method ? ` via ${fine.payment_method}` : ''}
        </ThemedText>
      </View>

      {justPaid ? (
        <View style={styles.successRow}>
          <Ionicons name="checkmark-circle" size={14} color={theme.success} />
          <ThemedText type="small" themeColor="success">
            Payment confirmed
          </ThemedText>
        </View>
      ) : null}

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
                  <Ionicons
                    name={PAYMENT_METHOD_ICON[method]}
                    size={14}
                    color={paymentMethod === method ? theme.onPrimary : theme.text}
                  />
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
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
    padding: Spacing.four,
  },
  summaryText: {
    gap: Spacing.half,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.half,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
  },
  flexButton: { flex: 1 },
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
});
