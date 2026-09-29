// Assertions for src/lib/format.ts. The mobile app has no test runner; Node 24
// strips the TypeScript types itself. Run from mobile/:
//   TZ=Asia/Colombo node scripts/check-format.mjs
import assert from 'node:assert/strict';

import { formatDate, formatDateShort, formatLkr } from '../src/lib/format.ts';

assert.equal(formatDate('2026-09-26T10:30:00+00:00'), '26 Sep 2026');
// 20:00 UTC on 31 Dec is already 1 Jan in Sri Lanka (UTC+5:30).
assert.equal(formatDate('2026-12-31T20:00:00+00:00'), '1 Jan 2027');
assert.equal(formatDate('not a date'), '—');
assert.equal(formatDate(''), '—');

// Short form for list rows: the year only when it isn't the current one.
const NOW = new Date('2026-09-29T12:00:00+05:30');
assert.equal(formatDateShort('2026-09-26T10:30:00+00:00', NOW), '26 Sep');
assert.equal(formatDateShort('2025-12-31T10:00:00+00:00', NOW), '31 Dec 2025');
assert.equal(formatDateShort('not a date', NOW), '—');

assert.equal(formatLkr(0), 'LKR\u00A00');
assert.equal(formatLkr(999), 'LKR\u00A0999');
assert.equal(formatLkr(10000), 'LKR\u00A010,000');
assert.equal(formatLkr(1234567), 'LKR\u00A01,234,567');
assert.ok(!formatLkr(25000).includes(' '), 'no breakable space inside an amount');
assert.equal(formatLkr(Number.NaN), '—', 'a missing amount shows a dash, like formatDate');

console.log('format checks passed');
