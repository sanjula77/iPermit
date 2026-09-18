import { useEffect, useState } from 'react';

import { getMyNotifications } from '@/api/notifications';

export function useUnreadNotificationCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getMyNotifications()
      .then((data) => {
        if (!cancelled) setCount(data.filter((n) => !n.read_at).length);
      })
      .catch(() => {
        // Badge count is a courtesy indicator, not critical -- fail silently.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return count;
}
