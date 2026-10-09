import { useCallback, useEffect, useState } from 'react';

import { listForOfficer } from '@/lib/offline-queue';
import { subscribeQueue } from '@/lib/queue-events';
import type { QueuedViolation } from '@/types/violation-queue';

// This officer's offline queue, kept up to date as items are added, sent or refused.
export function useViolationQueue(officerId: string | undefined) {
  const [items, setItems] = useState<QueuedViolation[]>([]);

  const reload = useCallback(async () => {
    if (!officerId) {
      setItems([]);
      return;
    }
    try {
      setItems(await listForOfficer(officerId));
    } catch {
      // The queue is a safety net: if it can't be read, show nothing rather than crash.
    }
  }, [officerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    return subscribeQueue(reload);
  }, [reload]);

  return {
    items,
    pending: items.filter((i) => i.status === 'pending'),
    rejected: items.filter((i) => i.status === 'rejected'),
    reload,
  };
}
