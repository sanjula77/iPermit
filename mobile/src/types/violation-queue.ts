import type { ViolationType } from '@/types/police';

// pending: saved on this phone, not yet accepted by the server.
// synced: the server has it (kept briefly so the officer can see it went through).
// rejected: the server refused it for good (see `error`); the officer decides what next.
export type QueueStatus = 'pending' | 'synced' | 'rejected';

export interface QueuedViolation {
  // Made on the phone; the server uses it so a resent violation is never recorded twice.
  clientId: string;
  // Only this officer's session may send it.
  officerId: string;
  driverId: string;
  // What the officer saw on screen (the driver's email), so the queue is readable.
  driverLabel: string;
  type: ViolationType;
  description: string | null;
  points: number | null;
  // When the officer recorded it (ISO, UTC). The server counts the points from here.
  occurredAt: string;
  status: QueueStatus;
  error: string | null;
  attempts: number;
  syncedAt: string | null;
}

export type NewQueuedViolation = Pick<
  QueuedViolation,
  'officerId' | 'driverId' | 'driverLabel' | 'type' | 'description' | 'points'
>;
