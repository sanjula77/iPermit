import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Fragment, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { submitAppeal } from '@/api/appeals';
import { extractErrorMessage } from '@/api/client';
import { payFine } from '@/api/fines';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ScreenState } from '@/components/screen-state';
import { StatusBadge } from '@/components/status-badge';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { VIOLATION_ICON, VIOLATION_LABEL } from '@/constants/violations';
import { useMyFines } from '@/hooks/use-my-fines';
import { useTheme } from '@/hooks/use-theme';
import {
  APPEAL_STATUS_BADGE,
  PAYMENT_METHOD_ICON,
  PAYMENT_METHOD_LABEL,
  appealForFine,
  canAppealFine,
  canPayFine,
  fineBadge,
  formatLkr,
} from '@/lib/fine-status';
import type { Appeal, FineWithViolation, PaymentMethod } from '@/types/fine';

const PAYMENT_METHODS: PaymentMethod[] = ['CARD', 'BANK', 'WALLET'];

export default function FineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // No single-fine endpoint exists; the driver's list is small, so reuse it.
  const { fines, appeals, error, isLoading, reload } = useMyFines();
  const fine = fines?.find((f) => f.id === id) ?? null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: 'Fine details', headerLargeTitleEnabled: false }} />
      <ThemedView style={styles.form}>
        {fines !== null && error ? (
          <ThemedText type="small" themeColor="danger" selectable testID="fine-refresh-error">
            Couldn&apos;t refresh: {error}
          </ThemedText>
        ) : null}
        {fines === null ? (
          <ScreenState error={isLoading ? null : error} onRetry={reload} testID="fine" />
        ) : !fine ? (
          <EmptyState icon="document-outline" title="Fine not found" message="It may have been removed." />
        ) : (
          <FineDetail fine={fine} appeal={appealForFine(appeals, fine.id)} onChanged={reload} />
        )}
      </ThemedView>
    </ScrollView>
  );
}

function FineDetail({
  fine,
  appeal,
  onChanged,
}: {
  fine: FineWithViolation;
  appeal: Appeal | null;
  onChanged: () => Promise<void>;
}) {
  const theme = useTheme();
  const [action, setAction] = useState<'pay' | 'appeal' | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD');
  const [appealReason, setAppealReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Blocks a same-frame double tap before isSubmitting has re-rendered.
  const submittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Set on a successful pay/appeal so the actions disappear at once, not only
  // after the follow-up reload returns (or never, if that reload fails).
  const [resolved, setResolved] = useState(false);

  const badge = fineBadge(fine, appeal);
  const canPay = canPayFine(fine, appeal);
  const canAppeal = canAppealFine(fine, appeal);
  const label = VIOLATION_LABEL[fine.violation.type];

  async function run(task: () => Promise<string>) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setIsSubmitting(true);
    try {
      const message = await task();
      setAction(null);
      setResolved(true);
      setNotice(message);
      await onChanged();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function confirmPayment() {
    // Payment can't be undone, so confirm the amount and method first.
    Alert.alert(
      `Pay ${formatLkr(fine.amount)}?`,
      `By ${PAYMENT_METHOD_LABEL[paymentMethod].toLowerCase()}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay',
          onPress: () =>
            run(async () => {
              const result = await payFine(fine.id, paymentMethod);
              return result.license_status === 'ACTIVE'
                ? `Payment confirmed. You now have ${result.driver_points} demerit points and your license is active.`
                : `Payment confirmed. You now have ${result.driver_points} demerit points; your license remains suspended.`;
            }),
        },
      ],
    );
  }

  function handleAppeal() {
    if (!appealReason.trim()) {
      setError('Please explain why you are appealing this fine.');
      return;
    }
    run(async () => {
      await submitAppeal(fine.id, appealReason.trim());
      setAppealReason('');
      return 'Appeal submitted. You will be notified when it is reviewed.';
    });
  }

  const rows: [string, string][] = [
    ['Date', new Date(fine.violation.confirmed_at).toLocaleDateString()],
    ['Points deducted', String(fine.violation.points_deducted)],
  ];
  if (fine.status === 'PAID') {
    if (fine.payment_method) rows.push(['Paid by', PAYMENT_METHOD_LABEL[fine.payment_method]]);
    if (fine.paid_at) rows.push(['Paid on', new Date(fine.paid_at).toLocaleDateString()]);
  }

  return (
    <>
      <View style={styles.hero}>
        <View style={[styles.iconCircle, { backgroundColor: theme.backgroundElement }]}>
          <Ionicons name={VIOLATION_ICON[fine.violation.type]} size={28} color={theme.text} />
        </View>
        <ThemedText type="subtitle">{label}</ThemedText>
        <ThemedText type="title" style={styles.tabular}>
          {formatLkr(fine.amount)}
        </ThemedText>
        <StatusBadge testID="fine-detail-status" tone={badge.tone} icon={badge.icon} label={badge.label} />
      </View>

      {notice ? (
        <View
          style={[styles.banner, { borderColor: theme.success, backgroundColor: `${theme.success}14` }]}
          accessibilityLiveRegion="polite"
          testID="fine-notice"
        >
          <Ionicons name="checkmark-circle" size={20} color={theme.success} />
          <ThemedText type="small" themeColor="success" style={styles.bannerText}>
            {notice}
          </ThemedText>
        </View>
      ) : null}

      <DetailRows rows={rows} />

      {appeal ? (
        <View style={styles.section} testID="fine-appeal-status">
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
            Appeal
          </ThemedText>
          <Card style={styles.appealCard}>
            <StatusBadge {...APPEAL_STATUS_BADGE[appeal.status]} />
            <ThemedText selectable>{appeal.reason}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Submitted {new Date(appeal.created_at).toLocaleDateString()}
              {appeal.resolved_at ? ` · Resolved ${new Date(appeal.resolved_at).toLocaleDateString()}` : ''}
            </ThemedText>
          </Card>
        </View>
      ) : null}

      {error ? (
        <ThemedText type="small" themeColor="danger" selectable accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      ) : null}

      {!resolved && (canPay || canAppeal) ? (
        action === 'pay' ? (
          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
              Payment method
            </ThemedText>
            <Card style={styles.list}>
              {PAYMENT_METHODS.map((method, i) => (
                <Fragment key={method}>
                  {i > 0 ? <View style={[styles.separator, { backgroundColor: theme.backgroundSelected }]} /> : null}
                  <Pressable
                    onPress={() => setPaymentMethod(method)}
                    testID={`pay-method-${method}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: paymentMethod === method }}
                    style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Ionicons name={PAYMENT_METHOD_ICON[method]} size={22} color={theme.text} />
                    <ThemedText style={styles.rowText}>{PAYMENT_METHOD_LABEL[method]}</ThemedText>
                    <Ionicons
                      name={paymentMethod === method ? 'radio-button-on' : 'radio-button-off'}
                      size={22}
                      color={paymentMethod === method ? theme.primary : theme.textSecondary}
                    />
                  </Pressable>
                </Fragment>
              ))}
            </Card>
            <Button onPress={confirmPayment} disabled={isSubmitting} testID="confirm-pay-button">
              <ThemedText type="smallBold" themeColor="onPrimary">
                {isSubmitting ? 'Paying…' : `Pay ${formatLkr(fine.amount)}`}
              </ThemedText>
            </Button>
            <Button variant="secondary" onPress={() => setAction(null)} disabled={isSubmitting}>
              <ThemedText type="smallBold">Cancel</ThemedText>
            </Button>
          </View>
        ) : action === 'appeal' ? (
          <View style={styles.section}>
            <TextField
              label="Why are you appealing this fine?"
              value={appealReason}
              onChangeText={setAppealReason}
              multiline
              autoCapitalize="sentences"
              autoCorrect
              testID="appeal-reason-input"
            />
            <Button onPress={handleAppeal} disabled={isSubmitting} testID="confirm-appeal-button">
              <ThemedText type="smallBold" themeColor="onPrimary">
                {isSubmitting ? 'Submitting…' : 'Submit appeal'}
              </ThemedText>
            </Button>
            <Button variant="secondary" onPress={() => setAction(null)} disabled={isSubmitting}>
              <ThemedText type="smallBold">Cancel</ThemedText>
            </Button>
          </View>
        ) : (
          <View style={styles.section}>
            {canPay ? (
              <Button onPress={() => setAction('pay')} testID={`pay-button-${fine.id}`}>
                <Ionicons name="card-outline" size={18} color={theme.onPrimary} />
                <ThemedText type="smallBold" themeColor="onPrimary">
                  Pay fine
                </ThemedText>
              </Button>
            ) : null}
            {canAppeal ? (
              <Button variant="secondary" onPress={() => setAction('appeal')} testID={`appeal-button-${fine.id}`}>
                <Ionicons name="chatbox-ellipses-outline" size={18} color={theme.text} />
                <ThemedText type="smallBold">Appeal</ThemedText>
              </Button>
            ) : null}
          </View>
        )
      ) : null}
    </>
  );
}

function DetailRows({ rows }: { rows: [string, string][] }) {
  const theme = useTheme();
  return (
    <Card style={styles.list}>
      {rows.map(([label, value], i) => (
        <Fragment key={label}>
          {i > 0 ? <View style={[styles.separator, { backgroundColor: theme.backgroundSelected }]} /> : null}
          <View style={styles.row}>
            <ThemedText themeColor="textSecondary" style={styles.rowText}>
              {label}
            </ThemedText>
            <ThemedText selectable>{value}</ThemedText>
          </View>
        </Fragment>
      ))}
    </Card>
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
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabular: { fontVariant: ['tabular-nums'] },
  banner: {
    flexDirection: 'row',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    borderCurve: 'continuous',
    padding: Spacing.three,
  },
  bannerText: { flex: 1 },
  section: { gap: Spacing.two },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  appealCard: { gap: Spacing.two },
  list: {
    paddingVertical: 0,
    gap: 0,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rowText: { flex: 1 },
});
