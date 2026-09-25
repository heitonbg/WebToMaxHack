import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDistance } from './distance.js';

test('zero distance is displayed explicitly', () => {
  assert.equal(formatDistance(0), '0 км');
  assert.equal(formatDistance(0.1), '100 м');
});
