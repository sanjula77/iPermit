import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';

import { getMyNotifications, markNotificationRead } from '@/api/notifications';
import { extractErrorMessage } from '@/api/client';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { AppNotification } from '@/types/notification';

const TYPE_LABEL: Record<AppNotification['type'], string> = {
  LICENSE_APPROVED: 'License Approved',
  LICENSE_REJECTED: 'License Rejected',
  FINE_ISSUED: 'Fine Issued',
  LICENSE_SUSPENDED: 'License Suspended',
  PAYMENT_CONFIRMED: 'Payment Confirmed',
  APPEAL_UPHELD: 'Appeal Upheld',
  APPEAL_OVERTURNED: 'Appeal Overturned',
  BADGE_CHANGED: 'Standing Changed',
  NEARBY_INCIDENT: 'Nearby Incident',
};

export default function NotificationsScreen() {
  const theme = useTheme();
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setNotifications(await getMyNotifications());
    } catch (err) {
      setLoadError(extractErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount, not a state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handlePress(notification: AppNotification) {
    if (notification.read_at) return;
    try {
      const updated = await markNotificationRead(notification.id);
      setNotifications((current) =>
        (current ?? []).map((n) => (n.id === updated.id ? updated : n)),
      );
    } catch {
      // Marking as read is a courtesy, not critical -- fail silently.
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <ThemedView style={styles.form}>
        <ThemedText type="title">Notifications</ThemedText>

        {loadError ? (
          <ThemedText type="small" themeColor="danger" selectable testID="notifications-error">
            {loadError}
          </ThemedText>
        ) : notifications === null ? (
          <ActivityIndicator testID="notifications-loading" />
        ) : notifications.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" testID="notifications-empty">
            No notifications yet.
          </ThemedText>
        ) : (
          notifications.map((notification) => (
            <Pressable
              key={notification.id}
              onPress={() => handlePress(notification)}
              testID={`notification-${notification.id}`}
            >
              <ThemedView
                type="backgroundElement"
                style={[
                  styles.card,
                  !notification.read_at && { borderLeftWidth: 3, borderLeftColor: theme.primary },
                ]}
              >
                <ThemedText type="smallBold">{TYPE_LABEL[notification.type]}</ThemedText>
                <ThemedText type="small">{notification.message}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {new Date(notification.created_at).toLocaleString()}
                  {notification.read_at ? '' : ' · unread'}
                </ThemedText>
              </ThemedView>
            </Pressable>
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
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
});
