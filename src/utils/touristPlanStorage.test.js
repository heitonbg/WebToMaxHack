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

test('saving an updated plan refreshes its timestamp and makes it latest', () => {
  touristPlanStorage.save('user-1', {
    city: 'Казань',
    date: '2026-10-02',
    savedAt: '2020-01-01T00:00:00.000Z',
    query: 'Старый план',
    options: [{ id: 'old', events: [{ id: 24 }] }],
  });
  touristPlanStorage.save('user-1', {
    city: 'Казань',
    date: '2026-10-02',
    savedAt: null,
    query: 'Изменённый план',
    options: [{ id: 'new', events: [{ id: 25 }] }],
  });

  const latest = touristPlanStorage.getLatest('user-1');
  assert.equal(latest.query, 'Изменённый план');
  assert.ok(Date.parse(latest.savedAt) > Date.parse('2020-01-01T00:00:00.000Z'));
});

test('anonymous draft is moved to the MAX user key after identity becomes available', () => {
  touristPlanStorage.save(null, {
    city: 'Казань',
    date: '2026-10-03',
    query: 'Анонимный черновик',
    options: [{ id: 'draft', events: [{ id: 26 }] }],
  });

  const migrated = touristPlanStorage.migrateAnonymous('max-user-9');
  assert.equal(migrated[0].query, 'Анонимный черновик');
  assert.equal(touristPlanStorage.getAll(null).length, 0);
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

test('server plans override same-date local copies and migrate legacy single-plan shape', () => {
  touristPlanStorage.save('user-1', {
    city: 'Казань',
    date: '2026-09-29',
    query: 'Локальный вариант',
    options: [{ id: 'local', title: 'Локально', events: [{ id: 20 }] }],
  });
  touristPlanStorage.mergeFromServer('user-1', [{
    city: 'Казань',
    date: '2026-09-29',
    savedAt: new Date().toISOString(),
    events: [{ id: 21 }],
  }]);

  const merged = touristPlanStorage.getLatest('user-1');
  assert.equal(merged.storage, 'server');
  assert.equal(merged.options[0].events[0].id, 21);
  assert.equal(merged.selectedOptionId, 'legacy-route');
});

test('offline-pinned plans stay pinned when automatic server snapshots merge', () => {
  const pinned = touristPlanStorage.pinOffline('user-1', {
    city: 'Казань',
    date: '2026-09-30',
    options: [{ id: 'route', events: [{ id: 22 }] }],
  });
  assert.equal(pinned.offlinePinned, true);

  touristPlanStorage.mergeFromServer('user-1', [{
    city: 'Казань',
    date: '2026-09-30',
    savedAt: new Date().toISOString(),
    options: [{ id: 'route-1', events: [{ id: 22 }] }],
  }]);

  const merged = touristPlanStorage.getLatest('user-1');
  assert.equal(merged.offlinePinned, true);
  assert.equal(merged.storage, 'server');
});

test('newer local draft wins over stale server snapshot until it can sync', () => {
  touristPlanStorage.save('user-1', {
    city: 'Казань',
    date: '2026-10-01',
    savedAt: '2026-09-27T12:00:00.000Z',
    query: 'Новое локальное пожелание',
    options: [{ id: 'local', events: [{ id: 23 }] }],
  });
  touristPlanStorage.mergeFromServer('user-1', [{
    city: 'Казань',
    date: '2026-10-01',
    savedAt: '2026-09-27T11:00:00.000Z',
    query: 'Старая серверная копия',
    options: [{ id: 'server', events: [{ id: 23 }] }],
  }]);

  assert.equal(touristPlanStorage.getLatest('user-1').query, 'Новое локальное пожелание');
  assert.equal(touristPlanStorage.getLatest('user-1').storage, undefined);
});
