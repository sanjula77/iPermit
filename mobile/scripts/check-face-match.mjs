// Assertions for src/lib/face-match.ts. Run from mobile/:
//   node scripts/check-face-match.mjs
import assert from 'node:assert/strict';

import { identificationParams, matchPercent, parseIdentification } from '../src/lib/face-match.ts';

assert.equal(matchPercent(0.873), 87);
assert.equal(matchPercent(-0.2), 0, 'negative cosine shows as 0%');
assert.equal(matchPercent(1.4), 100);

const face = { method: 'face', similarity: 0.61, confirmedByOfficer: true };
assert.deepEqual(parseIdentification(identificationParams(face)), face);
assert.deepEqual(parseIdentification(identificationParams({ method: 'qr' })), { method: 'qr' });
assert.deepEqual(parseIdentification(identificationParams({ method: 'lookup' })), { method: 'lookup' });
assert.equal(parseIdentification({}), null, 'opened without params (e.g. from Police Home)');
assert.equal(parseIdentification({ method: 'face', similarity: 'abc' }), null);

console.log('face match checks passed');
