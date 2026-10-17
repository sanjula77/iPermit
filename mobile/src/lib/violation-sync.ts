import { ApiError, extractErrorMessage } from '@/api/client';
import { recordViolation } from '@/api/police';
import * as queue from '@/lib/offline-queue';
import type { RecordViolationResponse } from '@/types/police';
import type { NewQueuedViolation, QueuedViolation } from '@/types/violation-queue';

// How long to wait for the server before treating the connection as gone. The
// request may still reach it; that is safe, because the queue's client id makes
// a resend return the first result instead of recording a second violation.
const SEND_TIMEOUT_MS = 12_000;

export type SubmitOutcome =
  | { kind: 'recorded'; result: RecordViolationResponse }
  | { kind: 'queued' };

// Worth trying again later: no connection, a timeout, a server error, the
// server asking us to slow down, or an expired login (the item waits for the
// same officer to sign in again). Everything else is the server saying no.
export function isRetryable(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true;
  return error.status >= 500 || [401, 408, 425, 429].includes(error.status);
}

async function send(item: QueuedViolation): Promise<RecordViolationResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    return await recordViolation({
      driverId: item.driverId,
      type: item.type,
      ...(item.type === 'OTHER'
        ? { description: item.description ?? undefined, points: item.points ?? undefined }
        : {}),
      clientId: item.clientId,
      occurredAt: item.occurredAt,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// Records a violation the officer just confirmed. It is saved on the phone
// first, so it survives even if the app closes mid-request; then sent right
// away. With no signal it stays queued and the sync below delivers it later.
// A refusal (for example "this driver has no licence") is thrown straight away
// so the officer sees it on the spot, and the item is not kept.
export async function submitOrQueue(item: NewQueuedViolation): Promise<SubmitOutcome> {
  const queued = await queue.enqueue(item);
  try {
    const result = await send(queued);
    await queue.markSynced(queued.clientId);
    return { kind: 'recorded', result };
  } catch (err) {
    if (isRetryable(err)) {
      await queue.noteAttempt(queued.clientId, extractErrorMessage(err));
      return { kind: 'queued' };
    }
    await queue.remove(queued.clientId);
    throw err;
  }
}

let running = false;

// Sends this officer's pending violations, oldest first. Stops at the first one
// that cannot be delivered for a passing reason, so the order is kept and the
// rest wait for the next try. A refusal marks that item rejected and moves on.
export async function syncPending(
  officerId: string,
): Promise<{ sent: number; rejected: number; remaining: number }> {
  if (running) return { sent: 0, rejected: 0, remaining: 0 };
  running = true;
  let sent = 0;
  let rejected = 0;
  try {
    const items = (await queue.listForOfficer(officerId)).filter((i) => i.status === 'pending');
    for (const item of items) {
      try {
        await send(item);
        await queue.markSynced(item.clientId);
        sent += 1;
      } catch (err) {
        if (isRetryable(err)) {
          await queue.noteAttempt(item.clientId, extractErrorMessage(err));
          break;
        }
        await queue.markRejected(item.clientId, extractErrorMessage(err));
        rejected += 1;
      }
    }
    await queue.purgeSynced();
    const remaining = (await queue.listForOfficer(officerId)).filter((i) => i.status === 'pending').length;
    return { sent, rejected, remaining };
  } finally {
    running = false;
  }
}
