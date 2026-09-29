// Assertions for src/lib/fine-summary.ts (no test runner in the mobile app).
// Run from mobile/:  TZ=Asia/Colombo node scripts/check-fine-summary.mjs
import assert from 'node:assert/strict';

import { summarizeFines } from '../src/lib/fine-summary.ts';

const NOW = new Date('2026-09-29T12:00:00+05:30');

function fine(id, { status = 'UNPAID', amount = 5000, confirmed = '2026-09-01T10:00:00+00:00', paid = null } = {}) {
  return {
    id,
    amount,
    status,
    created_at: confirmed,
    paid_at: paid,
    payment_method: paid ? 'CARD' : null,
    violation: { id: `v-${id}`, type: 'SPEEDING', points_deducted: 4, confirmed_at: confirmed, evidence_ref: null },
  };
}
function appeal(fineId, status) {
  return { id: `a-${fineId}`, fine: { id: fineId }, status, reason: 'x', created_at: '2026-09-02T00:00:00+00:00', resolved_at: null };
}

// Empty list.
assert.deepEqual(summarizeFines([], [], NOW), {
  outstanding: 0, unpaidCount: 0, paidThisYear: 0, finesThisYear: 0, payableCount: 0, oldestPayableId: null,
});

const fines = [
  fine('new-unpaid', { amount: 5000, confirmed: '2026-09-20T10:00:00+00:00' }),
  fine('old-unpaid', { amount: 10000, confirmed: '2026-08-01T10:00:00+00:00' }),
  // Oldest of all, but under a pending appeal: can't be paid, so never the Pay target.
  fine('appealed', { amount: 2000, confirmed: '2026-07-01T10:00:00+00:00' }),
  fine('paid-this-year', { status: 'PAID', amount: 4000, confirmed: '2026-03-01T10:00:00+00:00', paid: '2026-03-05T10:00:00+00:00' }),
  // Paid last year: not "this year" (paid 31 Dec 2025 23:00 in Colombo).
  fine('paid-last-year', { status: 'PAID', amount: 7000, confirmed: '2025-12-20T10:00:00+00:00', paid: '2025-12-31T17:30:00+00:00' }),
  // Paid but the timestamp is missing: counted nowhere in "paid this year".
  fine('paid-no-date', { status: 'PAID', amount: 1000, confirmed: '2026-02-01T10:00:00+00:00', paid: null }),
  fine('reversed', { status: 'REVERSED', amount: 25000, confirmed: '2026-01-10T10:00:00+00:00' }),
];
const appeals = [appeal('appealed', 'PENDING')];

const s = summarizeFines(fines, appeals, NOW);
assert.equal(s.outstanding, 17000, 'all unpaid, including the appealed one');
assert.equal(s.unpaidCount, 3);
assert.equal(s.paidThisYear, 4000);
assert.equal(s.finesThisYear, 6, 'every fine confirmed in 2026, whatever its status');
assert.equal(s.payableCount, 2);
assert.equal(s.oldestPayableId, 'old-unpaid');

// A rejected (UPHELD) appeal leaves the fine payable again.
assert.equal(summarizeFines([fine('f')], [appeal('f', 'UPHELD')], NOW).oldestPayableId, 'f');

console.log('fine summary checks passed');
