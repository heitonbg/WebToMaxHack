import assert from 'node:assert/strict';
import test from 'node:test';
import { touristPlanStorage } from './touristPlanStorage.js';

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) || null,
  setItem: (key, value) => values.set(key, value),
};

test('saved tourist plans are scoped by user and restored by city', () => {
  const saved = touristPlanStorage.save('user-1', {
    city: 'Казань',
    date: '2026-09-27',
    query: 'Музеи',
    events: [{ id: 17, title: 'Музей' }],
  });

  assert.equal(touristPlanStorage.getForCity('user-1', 'Казань').events[0].id, 17);
  assert.equal(touristPlanStorage.getForCity('user-2', 'Казань'), null);
  assert.equal(saved.savedAt.length > 0, true);
});

test('saving an edited plan replaces the same city and date', () => {
  touristPlanStorage.save('user-1', {
    city: 'Казань',
    date: '2026-09-27',
    query: 'Музеи',
    events: [{ id: 18, title: 'Новый музей' }],
  });

  const stored = JSON.parse(values.get('max_events_tourist_plans_v1'))['user-1'];
  assert.equal(stored.length, 1);
  assert.equal(touristPlanStorage.getForCity('user-1', 'Казань').events[0].id, 18);
});

test('latest saved plan can be reopened even when the feed city differs', () => {
  touristPlanStorage.save('user-1', {
    city: 'Москва',
    date: '2026-09-28',
    query: 'Архитектура',
    events: [{ id: 19, title: 'Экскурсия' }],
  });

  assert.equal(touristPlanStorage.getLatest('user-1').city, 'Москва');
  assert.equal(touristPlanStorage.getLatest('user-2'), null);
});
