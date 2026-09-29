import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Fragment, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { submitAppeal } from '@/api/appeals';
import { extractErrorMessage } from '@/api/client';
import { payFine } from '@/api/fines';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { IconTile } from '@/components/icon-tile';
import { ScreenState } from '@/components/screen-state';
import { StatusBadge } from '@/components/status-badge';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ScreenScroll } from '@/components/screen-scroll';
import { Spacing } from '@/constants/theme';
import { VIOLATION_COLOR, VIOLATION_ICON, VIOLATION_LABEL } from '@/constants/violations';
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
} from '@/lib/fine-status';
import { formatDate, formatLkr } from '@/lib/format';
import type { Appeal, FineWithViolation, PaymentMethod } from '@/types/fine';

const PAYMENT_METHODS: PaymentMethod[] = ['CARD', 'BANK', 'WALLET'];

export default function FineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // No single-fine endpoint exists; the driver's list is small, so reuse it.
  const { fines, appeals, error, isLoading, reload } = useMyFines();
  const fine = fines?.find((f) => f.id === id) ?? null;

  return (
    <ScreenScroll
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: 'Fine details', headerLargeTitleEnabled: false }} />
      {fines !== null && error ? (
        <Banner tone="danger" text={`Couldn't refresh: ${error}`} testID="fine-refresh-error" />
      ) : null}
      {fines === null ? (
        <ScreenState error={isLoading ? null : error} onRetry={reload} testID="fine" />
      ) : !fine ? (
        <EmptyState icon="document-outline" title="Fine not found" message="It may have been removed." />
      ) : (
        <FineDetail fine={fine} appeal={appealForFine(appeals, fine.id)} onChanged={reload} />
      )}
    </ScreenScroll>
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
      // Same moment the success banner appears; one haptic per committed action.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAction(null);
      setResolved(true);
      setNotice(message);
      await onChanged();
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
    ['Date', formatDate(fine.violation.confirmed_at)],
    // Demerit points count up towards suspension (the license card shows n / 10).
    ['Demerit points', `+${fine.violation.points_deducted}`],
  ];
  if (fine.status === 'PAID') {
    if (fine.payment_method) rows.push(['Paid by', PAYMENT_METHOD_LABEL[fine.payment_method]]);
    if (fine.paid_at) rows.push(['Paid on', formatDate(fine.paid_at)]);
  }

  return (
    <>
      <Card variant="raised" style={styles.summary}>
        <IconTile
          icon={VIOLATION_ICON[fine.violation.type]}
          color={theme[VIOLATION_COLOR[fine.violation.type]]}
          size={56}
        />
        <ThemedText type="subtitle" style={styles.centered}>
          {label}
        </ThemedText>
        <ThemedText type="display" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {formatLkr(fine.amount)}
        </ThemedText>
        <StatusBadge testID="fine-detail-status" tone={badge.tone} icon={badge.icon} label={badge.label} />
      </Card>

      {notice ? <Banner tone="success" text={notice} testID="fine-notice" /> : null}

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
              Submitted {formatDate(appeal.created_at)}
              {appeal.resolved_at ? ` · Resolved ${formatDate(appeal.resolved_at)}` : ''}
            </ThemedText>
          </Card>
        </View>
      ) : null}

      {error ? <Banner tone="danger" text={error} testID="fine-action-error" /> : null}

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
            <Button variant="ghost" onPress={() => setAction(null)} disabled={isSubmitting}>
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
              style={styles.appealInput}
              testID="appeal-reason-input"
            />
            <Button onPress={handleAppeal} disabled={isSubmitting} testID="confirm-appeal-button">
              <ThemedText type="smallBold" themeColor="onPrimary">
                {isSubmitting ? 'Submitting…' : 'Submit appeal'}
              </ThemedText>
            </Button>
            <Button variant="ghost" onPress={() => setAction(null)} disabled={isSubmitting}>
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
  summary: { alignItems: 'center', gap: Spacing.two, padding: Spacing.four },
  centered: { textAlign: 'center' },
  section: { gap: Spacing.two },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  appealCard: { gap: Spacing.two },
  appealInput: { minHeight: 96, textAlignVertical: 'top' },
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
