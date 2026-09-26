import { useSyncExternalStore } from 'react';

// App-wide unread-notification count. The tab bar badge reads it; the
// Notifications screen writes it whenever it loads or marks something read, so
// the badge stays in step without its own polling.
let unreadCount = 0;
// Bumped on every write, so a slow earlier fetch can tell it's been superseded.
let version = 0;
const listeners = new Set<() => void>();

export function setUnreadCount(count: number): void {
  version += 1;
  if (count === unreadCount) return;
  unreadCount = count;
  listeners.forEach((listener) => listener());
}

export function getUnreadCountVersion(): number {
  return version;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUnreadCount(): number {
  return useSyncExternalStore(subscribe, () => unreadCount);
}
