import * as SQLite from 'expo-sqlite';

import { emitQueueChange } from '@/lib/queue-events';
import type { NewQueuedViolation, QueuedViolation } from '@/types/violation-queue';

// The phone's own copy of violations an officer recorded, kept in SQLite so a
// dead zone, a dropped connection or a closed app cannot lose one. Only the
// minimum is stored: ids, the violation, and the driver's email as a label.
// Rows that were sent are deleted after a day.

const SYNCED_KEEP_MS = 24 * 60 * 60 * 1000;

interface Row {
  client_id: string;
  officer_id: string;
  driver_id: string;
  driver_label: string;
  type: QueuedViolation['type'];
  description: string | null;
  points: number | null;
  occurred_at: string;
  status: QueuedViolation['status'];
  error: string | null;
  attempts: number;
  synced_at: string | null;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function db(): Promise<SQLite.SQLiteDatabase> {
  dbPromise ??= SQLite.openDatabaseAsync('ipermit-queue.db').then(async (database) => {
    await database.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS violation_queue (
        client_id TEXT PRIMARY KEY NOT NULL,
        officer_id TEXT NOT NULL,
        driver_id TEXT NOT NULL,
        driver_label TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        points INTEGER,
        occurred_at TEXT NOT NULL,
        status TEXT NOT NULL,
        error TEXT,
        attempts INTEGER NOT NULL DEFAULT 0,
        synced_at TEXT
      );
    `);
    return database;
  });
  return dbPromise;
}

function fromRow(row: Row): QueuedViolation {
  return {
    clientId: row.client_id,
    officerId: row.officer_id,
    driverId: row.driver_id,
    driverLabel: row.driver_label,
    type: row.type,
    description: row.description,
    points: row.points,
    occurredAt: row.occurred_at,
    status: row.status,
    error: row.error,
    attempts: row.attempts,
    syncedAt: row.synced_at,
  };
}

function newClientId(): string {
  return globalThis.crypto.randomUUID();
}

// Saves a violation as pending, stamped with the time the officer recorded it.
export async function enqueue(item: NewQueuedViolation): Promise<QueuedViolation> {
  const clientId = newClientId();
  const occurredAt = new Date().toISOString();
  const database = await db();
  await database.runAsync(
    `INSERT INTO violation_queue
       (client_id, officer_id, driver_id, driver_label, type, description, points, occurred_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [clientId, item.officerId, item.driverId, item.driverLabel, item.type, item.description, item.points, occurredAt],
  );
  emitQueueChange();
  return {
    ...item,
    clientId,
    occurredAt,
    status: 'pending',
    error: null,
    attempts: 0,
    syncedAt: null,
  };
}

// This officer's items, oldest first (the order they were recorded in).
export async function listForOfficer(officerId: string): Promise<QueuedViolation[]> {
  const database = await db();
  const rows = await database.getAllAsync<Row>(
    'SELECT * FROM violation_queue WHERE officer_id = ? ORDER BY occurred_at ASC',
    [officerId],
  );
  return rows.map(fromRow);
}

export async function markSynced(clientId: string): Promise<void> {
  const database = await db();
  await database.runAsync(
    "UPDATE violation_queue SET status = 'synced', error = NULL, synced_at = ? WHERE client_id = ?",
    [new Date().toISOString(), clientId],
  );
  emitQueueChange();
}

export async function markRejected(clientId: string, message: string): Promise<void> {
  const database = await db();
  await database.runAsync(
    "UPDATE violation_queue SET status = 'rejected', error = ?, attempts = attempts + 1 WHERE client_id = ?",
    [message, clientId],
  );
  emitQueueChange();
}

// A try that failed for a reason that may pass (no signal, server busy): stays pending.
export async function noteAttempt(clientId: string, message: string): Promise<void> {
  const database = await db();
  await database.runAsync(
    'UPDATE violation_queue SET attempts = attempts + 1, error = ? WHERE client_id = ?',
    [message, clientId],
  );
  emitQueueChange();
}

export async function remove(clientId: string): Promise<void> {
  const database = await db();
  await database.runAsync('DELETE FROM violation_queue WHERE client_id = ?', [clientId]);
  emitQueueChange();
}

// Drops items the server already has once they are a day old.
export async function purgeSynced(): Promise<void> {
  const database = await db();
  await database.runAsync("DELETE FROM violation_queue WHERE status = 'synced' AND synced_at < ?", [
    new Date(Date.now() - SYNCED_KEEP_MS).toISOString(),
  ]);
  emitQueueChange();
}
