import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesConfiguredFilters, matchesTimeFilter, getEventDistanceKm } from './eventFilters.js';

const now = new Date(2026, 8, 25, 12, 0);
const createdOnline = {
  date: '2026-09-25, 13:00',
  format: 'Онлайн',
  district: 'Онлайн',
  category: 'Настольные игры',
  price: 'Бесплатно',
  distance: '0.0 км'
};

test('today + online includes a newly created ISO-dated event', () => {
  assert.equal(matchesConfiguredFilters(createdOnline, { time: 'Сегодня', format: 'Онлайн' }, null, now), true);
  assert.equal(matchesConfiguredFilters(createdOnline, { time: 'Завтра', format: 'Онлайн' }, null, now), false);
  assert.equal(matchesConfiguredFilters(createdOnline, { time: 'Сегодня', format: 'Офлайн' }, null, now), false);
});

test('relative and ISO dates behave the same for today, tomorrow and now', () => {
  assert.equal(matchesTimeFilter({ date: 'Сегодня, 13:00' }, 'Сегодня', now), true);
  assert.equal(matchesTimeFilter({ date: '2026-09-25, 13:00' }, 'Сейчас', now), true);
  assert.equal(matchesTimeFilter({ date: '2026-09-26, 09:00' }, 'Завтра', now), true);
  assert.equal(matchesTimeFilter({ date: '2026-09-24, 13:00' }, 'Сегодня', now), false);
});

test('category, price and Pushkin card combine without dropping valid events', () => {
  assert.equal(matchesConfiguredFilters(createdOnline, { category: ['Настольные игры'], price: 'Бесплатно' }, null, now), true);
  assert.equal(matchesConfiguredFilters(createdOnline, { category: ['Спорт'] }, null, now), false);
  assert.equal(matchesConfiguredFilters({ ...createdOnline, price: 'Пушкинская карта' }, { pushkinCard: true }, null, now), true);
});

test('distance uses coordinates instead of stale saved display distance', () => {
  const offline = { ...createdOnline, format: 'Офлайн', district: 'Центр', lat: 55.8, lng: 49.1 };
  const near = { lat: 55.8, lng: 49.1 };
  const far = { lat: 56.2, lng: 49.1 };
  assert.equal(getEventDistanceKm(offline, near), 0);
  assert.equal(matchesConfiguredFilters(offline, { distance: 'до 1 км' }, far, now), false);
  assert.equal(matchesConfiguredFilters(offline, { distance: 'до 1 км' }, near, now), true);
  assert.equal(matchesConfiguredFilters(createdOnline, { distance: 'до 1 км' }, near, now), false);
});
