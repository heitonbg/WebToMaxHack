import assert from 'node:assert/strict';
import test from 'node:test';
import { getTouristRouteSchedule } from './touristRouteSchedule.js';

const now = new Date(2026, 8, 25, 8, 0);

test('places receive estimated windows after the preceding fixed event', () => {
  const schedule = getTouristRouteSchedule([
    { id: 1, date: '2026-09-25, 10:00', duration: '1 ч' },
    { id: 'cafe', kind: 'restaurant', durationMinutes: 45 },
    { id: 2, date: '2026-09-25, 13:00', duration: '1 ч' },
  ], { now });

  assert.equal(schedule[1].start.getHours(), 11);
  assert.equal(schedule[1].end.getMinutes(), 45);
  assert.equal(schedule[1].overlapsNext, false);
});

test('schedule flags a custom stop that overlaps the next fixed event', () => {
  const schedule = getTouristRouteSchedule([
    { id: 1, date: '2026-09-25, 10:00', duration: '1 ч' },
    { id: 'museum', kind: 'attraction', durationMinutes: 120 },
    { id: 2, date: '2026-09-25, 12:30', duration: '1 ч' },
  ], { now });

  assert.equal(schedule[1].overlapsNext, true);
  assert.equal(schedule[2].overlapsPrevious, true);
});