import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { extractErrorMessage } from '@/api/client';
import { getMyNotifications, markNotificationRead } from '@/api/notifications';
import { Banner } from '@/components/banner';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { IconTile } from '@/components/icon-tile';
import { ScreenState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { ScreenScroll } from '@/components/screen-scroll';
import { KIND_COLOR, TYPE_INFO } from '@/constants/notifications';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { relativeTime } from '@/lib/relative-time';
import { setUnreadCount } from '@/lib/unread-count';
import type { AppNotification } from '@/types/notification';

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

  const unreadIds = (notifications ?? []).filter((n) => !n.read_at).map((n) => n.id);
  const [markingAll, setMarkingAll] = useState(false);

  // No bulk endpoint: mark each unread alert concurrently, then apply whichever
  // succeeded in one update (the tab badge follows via the effect above).
  async function markAllRead() {
    if (markingAll || unreadIds.length === 0) return;
    setMarkingAll(true);
    const results = await Promise.allSettled(unreadIds.map((id) => markNotificationRead(id)));
    const updated = new Map(
      results.flatMap((r) => (r.status === 'fulfilled' ? [[r.value.id, r.value] as const] : [])),
    );
    setNotifications((current) => (current ?? []).map((n) => updated.get(n.id) ?? n));
    if (updated.size < unreadIds.length) setError("Couldn't mark every alert as read. Pull to refresh and try again.");
    setMarkingAll(false);
  }

  const groups = (['Today', 'Yesterday', 'Earlier'] as const)
    .map((label) => ({
      label,
      items: (notifications ?? []).filter((n) => dayGroup(n.created_at, now) === label),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <ScreenScroll
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <Stack.Screen
        options={{
          headerRight: () =>
            unreadIds.length > 0 ? (
              <Pressable
                onPress={markAllRead}
                disabled={markingAll}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Mark all alerts as read"
                testID="notifications-mark-all"
                style={({ pressed }) => ({ opacity: pressed || markingAll ? 0.6 : 1 })}
              >
                <ThemedText type="smallBold" themeColor="onBrand">
                  {markingAll ? 'Marking…' : 'Mark all read'}
                </ThemedText>
              </Pressable>
            ) : null,
        }}
      />
      {notifications !== null && error ? (
        <Banner tone="danger" text={`Couldn't refresh: ${error}`} testID="notifications-error" />
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
            {/* One card per alert, with a small space between them. */}
            {group.items.map((notification) => (
              <Card key={notification.id} style={styles.list}>
                <NotificationRow
                  notification={notification}
                  now={now}
                  onPress={() => handlePress(notification)}
                />
              </Card>
            ))}
          </View>
        ))
      )}
    </ScreenScroll>
  );
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
      <IconTile icon={info.icon} color={color} />
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
  section: { gap: Spacing.two },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    paddingVertical: 0,
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
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
