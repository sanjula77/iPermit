import { useEffect } from 'react';

import { getMyNotifications } from '@/api/notifications';
import { getUnreadCountVersion, setUnreadCount, useUnreadCount } from '@/lib/unread-count';

// The unread count for the tab badge: seeded once on mount, then kept current
// by the Notifications screen through the shared store.
export function useUnreadNotificationCount(): number {
  useEffect(() => {
    let cancelled = false;
    // The store is module-level: clear the previous account's count on mount
    // (the tabs remount on every login) instead of showing it until the fetch.
    setUnreadCount(0);
    const startVersion = getUnreadCountVersion();
    getMyNotifications()
      .then((data) => {
        // Skip if the Notifications screen has written a fresher count since.
        if (!cancelled && getUnreadCountVersion() === startVersion) {
          setUnreadCount(data.filter((n) => !n.read_at).length);
        }
      })
      .catch(() => {
        // Badge count is a courtesy indicator, not critical -- fail silently.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return useUnreadCount();
}
