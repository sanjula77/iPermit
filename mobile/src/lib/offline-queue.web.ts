import { emitQueueChange } from '@/lib/queue-events';
import type { NewQueuedViolation, QueuedViolation } from '@/types/violation-queue';

// Browser stand-in for the phone's SQLite queue (used by the web preview only):
// the same functions, kept in localStorage. expo-sqlite's web support needs
// extra bundler setup that this app does not use.

const KEY = 'ipermit_violation_queue';
const SYNCED_KEEP_MS = 24 * 60 * 60 * 1000;

function load(): QueuedViolation[] {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? '[]') as QueuedViolation[];
  } catch {
    return [];
  }
}

function save(items: QueuedViolation[]): void {
  window.localStorage.setItem(KEY, JSON.stringify(items));
  emitQueueChange();
}

function update(clientId: string, change: (item: QueuedViolation) => QueuedViolation): void {
  save(load().map((item) => (item.clientId === clientId ? change(item) : item)));
}

export async function enqueue(item: NewQueuedViolation): Promise<QueuedViolation> {
  const queued: QueuedViolation = {
    ...item,
    clientId: globalThis.crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    status: 'pending',
    error: null,
    attempts: 0,
    syncedAt: null,
  };
  save([...load(), queued]);
  return queued;
}

export async function listForOfficer(officerId: string): Promise<QueuedViolation[]> {
  return load()
    .filter((item) => item.officerId === officerId)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

export async function markSynced(clientId: string): Promise<void> {
  update(clientId, (item) => ({ ...item, status: 'synced', error: null, syncedAt: new Date().toISOString() }));
}

export async function markRejected(clientId: string, message: string): Promise<void> {
  update(clientId, (item) => ({ ...item, status: 'rejected', error: message, attempts: item.attempts + 1 }));
}

export async function noteAttempt(clientId: string, message: string): Promise<void> {
  update(clientId, (item) => ({ ...item, error: message, attempts: item.attempts + 1 }));
}

export async function remove(clientId: string): Promise<void> {
  save(load().filter((item) => item.clientId !== clientId));
}

export async function purgeSynced(): Promise<void> {
  const cutoff = new Date(Date.now() - SYNCED_KEEP_MS).toISOString();
  save(load().filter((item) => !(item.status === 'synced' && (item.syncedAt ?? '') < cutoff)));
}
