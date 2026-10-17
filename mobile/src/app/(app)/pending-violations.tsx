import { Fragment, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { IconTile } from '@/components/icon-tile';
import { ListRow, ListSeparator } from '@/components/list-row';
import { ScreenScroll } from '@/components/screen-scroll';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { VIOLATION_COLOR, VIOLATION_ICON, violationTitle } from '@/constants/violations';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { useViolationQueue } from '@/hooks/use-violation-queue';
import { relativeTime } from '@/lib/relative-time';
import { remove } from '@/lib/offline-queue';
import { syncPending } from '@/lib/violation-sync';
import type { QueuedViolation } from '@/types/violation-queue';

// Everything the officer recorded on this phone that the server may not have yet.
export default function PendingViolationsScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { items, pending, rejected } = useViolationQueue(user?.id);
  const [isSending, setIsSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function sendNow() {
    if (!user || isSending) return;
    setIsSending(true);
    setNotice(null);
    try {
      const { sent, remaining } = await syncPending(user.id);
      setNotice(
        remaining > 0
          ? `Still no connection. ${remaining} waiting.`
          : sent > 0
            ? `Sent ${sent}.`
            : 'Nothing to send.',
      );
    } finally {
      setIsSending(false);
    }
  }

  // Newest first for reading; the queue itself sends oldest first.
  const shown = [...items].reverse();

  return (
    <ScreenScroll gap={Spacing.three}>
      {notice ? <Banner tone="info" text={notice} testID="pending-notice" /> : null}
      {pending.length > 0 ? (
        <Button onPress={sendNow} disabled={isSending} testID="send-pending">
          <Ionicons name="cloud-upload-outline" size={18} color={theme.onPrimary} />
          <ThemedText type="smallBold" themeColor="onPrimary">
            {isSending ? 'Sending…' : `Send ${pending.length} now`}
          </ThemedText>
        </Button>
      ) : null}

      {shown.length === 0 ? (
        <EmptyState
          icon="checkmark-done-circle-outline"
          title="Nothing waiting"
          message="Violations you record with no signal are saved here and sent when you are back online."
        />
      ) : (
        <Card style={styles.list} testID="pending-list">
          {shown.map((item, i) => (
            <Fragment key={item.clientId}>
              {i > 0 ? <ListSeparator /> : null}
              <QueueRow item={item} />
            </Fragment>
          ))}
        </Card>
      )}
      {rejected.length > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          A refused violation was not recorded. Check the reason, then record it again if it still applies.
        </ThemedText>
      ) : null}
    </ScreenScroll>
  );
}

function QueueRow({ item }: { item: QueuedViolation }) {
  const theme = useTheme();
  const title = violationTitle(item.type, item.description);
  const badge =
    item.status === 'pending' ? (
      <StatusBadge tone="warning" icon="time-outline" label="Waiting" />
    ) : item.status === 'synced' ? (
      <StatusBadge tone="success" icon="checkmark-circle-outline" label="Sent" />
    ) : (
      <StatusBadge tone="danger" icon="close-circle-outline" label="Refused" />
    );
  return (
    <ListRow
      testID={`queued-${item.clientId}`}
      leading={<IconTile icon={VIOLATION_ICON[item.type]} color={theme[VIOLATION_COLOR[item.type]]} />}
      title={title}
      meta={`${item.driverLabel} · ${relativeTime(item.occurredAt)}`}
      badge={badge}
      footer={
        item.status === 'rejected' ? (
          <>
            <ThemedText type="small" themeColor="danger">
              {item.error}
            </ThemedText>
            <Pressable
              onPress={() => remove(item.clientId)}
              accessibilityRole="button"
              accessibilityLabel="Dismiss this refused violation"
              hitSlop={8}
              style={styles.dismiss}
              testID={`dismiss-${item.clientId}`}
            >
              <ThemedText type="smallBold" themeColor="primary">
                Dismiss
              </ThemedText>
            </Pressable>
          </>
        ) : item.status === 'pending' && item.attempts > 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Not sent yet ({item.attempts} {item.attempts === 1 ? 'try' : 'tries'}). Will retry automatically.
          </ThemedText>
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 0, gap: 0 },
  dismiss: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
});
