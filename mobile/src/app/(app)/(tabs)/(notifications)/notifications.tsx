import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, type Href } from 'expo-router';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { extractErrorMessage } from '@/api/client';
import { getMyNotifications, markNotificationRead } from '@/api/notifications';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ScreenState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { relativeTime } from '@/lib/relative-time';
import { setUnreadCount } from '@/lib/unread-count';
import type { AppNotification, NotificationType } from '@/types/notification';

type Kind = 'good' | 'bad' | 'info';

// UPHELD means the fine stands (appeal rejected); OVERTURNED means it was
// reversed -- same plain wording as the Fine details screen.
const TYPE_INFO: Record<
  NotificationType,
  { title: string; icon: keyof typeof Ionicons.glyphMap; kind: Kind; target: Href }
> = {
  LICENSE_APPROVED: { title: 'License approved', icon: 'checkmark-circle', kind: 'good', target: '/(app)/(tabs)/(home)' },
  LICENSE_REJECTED: { title: 'Application not approved', icon: 'close-circle', kind: 'bad', target: '/(app)/(tabs)/(home)' },
  FINE_ISSUED: { title: 'Fine issued', icon: 'receipt-outline', kind: 'bad', target: '/(app)/(tabs)/(fines)/fines' },
  LICENSE_SUSPENDED: { title: 'License suspended', icon: 'ban', kind: 'bad', target: '/(app)/(tabs)/(home)' },
  PAYMENT_CONFIRMED: { title: 'Payment confirmed', icon: 'card', kind: 'good', target: '/(app)/(tabs)/(fines)/fines' },
  APPEAL_UPHELD: { title: 'Appeal rejected', icon: 'close-circle', kind: 'bad', target: '/(app)/(tabs)/(fines)/fines' },
  APPEAL_OVERTURNED: { title: 'Appeal accepted', icon: 'arrow-undo-circle', kind: 'good', target: '/(app)/(tabs)/(fines)/fines' },
  BADGE_CHANGED: { title: 'Standing changed', icon: 'medal-outline', kind: 'info', target: '/(app)/(tabs)/(home)' },
  NEARBY_INCIDENT: { title: 'Nearby incident', icon: 'location', kind: 'info', target: '/(app)/(tabs)/(incidents)/incidents' },
};

const KIND_COLOR: Record<Kind, ThemeColor> = { good: 'success', bad: 'danger', info: 'primary' };

function dayGroup(iso: string, now: number): 'Today' | 'Yesterday' | 'Earlier' {
  const today = new Date(now);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const time = Date.parse(iso);
  if (time >= startOfToday) return 'Today';
  if (time >= startOfToday - 24 * 60 * 60 * 1000) return 'Yesterday';
  return 'Earlier';
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // "Now" for relative times and day groups. Held in state and refreshed on
  // every load: computed inline, the React Compiler would cache each row's
  // "5 min ago" forever (the screen stays mounted across tab switches).
  const [now, setNow] = useState(() => Date.now());
  // Only the newest load may write state (focus reloads and pull-to-refresh
  // can overlap).
  const latestLoad = useRef(0);

  const load = useCallback(async () => {
    const request = ++latestLoad.current;
    try {
      const data = await getMyNotifications();
      if (request !== latestLoad.current) return;
      setNotifications(data);
      setNow(Date.now());
      setError(null);
    } catch (err) {
      if (request !== latestLoad.current) return;
      setError(extractErrorMessage(err));
    }
  }, []);

  // Keep the tab badge in step with what this screen shows (outside the state
  // updaters, which must stay free of side effects).
  useEffect(() => {
    if (notifications) setUnreadCount(notifications.filter((n) => !n.read_at).length);
  }, [notifications]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function handlePress(notification: AppNotification) {
    router.navigate(TYPE_INFO[notification.type].target);
    if (notification.read_at) return;
    // Mark read in the background: it's a courtesy, not worth blocking on.
    markNotificationRead(notification.id)
      .then((updated) => {
        setNotifications((current) => (current ?? []).map((n) => (n.id === updated.id ? updated : n)));
      })
      .catch(() => {
        // Marking as read is a courtesy, not critical -- fail silently.
      });
  }

  const groups = (['Today', 'Yesterday', 'Earlier'] as const)
    .map((label) => ({
      label,
      items: (notifications ?? []).filter((n) => dayGroup(n.created_at, now) === label),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <ThemedView style={styles.form}>
        {notifications !== null && error ? (
          <ThemedText type="small" themeColor="danger" selectable testID="notifications-error">
            Couldn&apos;t refresh: {error}
          </ThemedText>
        ) : null}
        {notifications === null ? (
          <ScreenState error={refreshing ? null : error} onRetry={handleRefresh} testID="notifications" />
        ) : notifications.length === 0 ? (
          <EmptyState
            testID="notifications-empty"
            icon="notifications-outline"
            title="No notifications yet"
            message="We'll let you know about your license, fines and appeals here."
          />
        ) : (
          groups.map((group) => (
            <View key={group.label} style={styles.section}>
              <ThemedText
                type="smallBold"
                themeColor="textSecondary"
                style={styles.sectionLabel}
                accessibilityRole="header"
              >
                {group.label}
              </ThemedText>
              <Card style={styles.list}>
                {group.items.map((notification, i) => (
                  <Fragment key={notification.id}>
                    {i > 0 ? <Separator /> : null}
                    <NotificationRow
                      notification={notification}
                      now={now}
                      onPress={() => handlePress(notification)}
                    />
                  </Fragment>
                ))}
              </Card>
            </View>
          ))
        )}
      </ThemedView>
    </ScrollView>
  );
}

function Separator() {
  const theme = useTheme();
  return <View style={[styles.separator, { backgroundColor: theme.backgroundSelected }]} />;
}

function NotificationRow({
  notification,
  now,
  onPress,
}: {
  notification: AppNotification;
  now: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const age = relativeTime(notification.created_at, now);
  const info = TYPE_INFO[notification.type];
  const color = theme[KIND_COLOR[info.kind]];
  const unread = !notification.read_at;

  return (
    <Pressable
      onPress={onPress}
      testID={`notification-${notification.id}`}
      accessibilityRole="button"
      accessibilityHint="Opens the related screen"
      accessibilityLabel={`${unread ? 'Unread. ' : ''}${info.title}. ${notification.message}. ${age}`}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={[styles.iconCircle, { backgroundColor: `${color}1F` }]}>
        <Ionicons name={info.icon} size={20} color={color} />
      </View>
      <View style={styles.rowText}>
        <View style={styles.titleRow}>
          <ThemedText type={unread ? 'smallBold' : 'small'} style={styles.title} numberOfLines={1}>
            {info.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {age}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor={unread ? 'text' : 'textSecondary'} numberOfLines={3}>
          {notification.message}
        </ThemedText>
      </View>
      {unread ? <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} testID="notification-unread" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  form: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  section: { gap: Spacing.two },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    paddingVertical: 0,
    gap: 0,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  title: { flex: 1 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: Spacing.two,
  },
});
