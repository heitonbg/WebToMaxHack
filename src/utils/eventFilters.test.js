// src/utils/eventFilters.test.js
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  matchesConfiguredFilters,
  matchesTimeFilter,
  getEventDistanceKm,
  getEventStatus,
  parseEventDuration,
} from './eventFilters.js';

const now = new Date(2026, 8, 25, 12, 0);

const createdOnline = {
  date: '2026-09-25, 13:00',
  format: 'Онлайн',
  district: 'Онлайн',
  category: 'Настольные игры',
  price: 'Бесплатно',
  distance: '0.0 км',
  duration: '2 ч',
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

test('getEventStatus returns correct status for all phases', () => {
  const event = { date: '2026-09-25, 14:00', duration: '2 ч' };
  assert.equal(getEventStatus(event, new Date(2026, 8, 25, 11, 0)), 'upcoming');
  assert.equal(getEventStatus(event, new Date(2026, 8, 25, 13, 30)), 'soon');
  assert.equal(getEventStatus(event, new Date(2026, 8, 25, 14, 30)), 'live');
  assert.equal(getEventStatus(event, new Date(2026, 8, 25, 16, 30)), 'past');
});

test('getEventStatus treats exactly 1 hour before start as soon', () => {
  const event = { date: '2026-09-25, 14:00', duration: '2 ч' };
  assert.equal(getEventStatus(event, new Date(2026, 8, 25, 13, 0)), 'soon');
});

test('getEventStatus uses 2h default when duration is missing', () => {
  const event = { date: '2026-09-25, 14:00' };
  assert.equal(getEventStatus(event, new Date(2026, 8, 25, 15, 30)), 'live');
  assert.equal(getEventStatus(event, new Date(2026, 8, 25, 16, 30)), 'past');
});

test('parseEventDuration supports hours, minutes and plain numbers', () => {
  assert.equal(parseEventDuration({ duration: '3 ч' }), 3 * 60 * 60 * 1000);
  assert.equal(parseEventDuration({ duration: '1 ч 30 мин' }), 90 * 60 * 1000);
  assert.equal(parseEventDuration({ duration: '45 мин' }), 45 * 60 * 1000);
  assert.equal(parseEventDuration({ duration: 120 }), 120 * 60 * 1000);
  assert.equal(parseEventDuration({ duration: '60' }), 60 * 60 * 1000);
  assert.equal(parseEventDuration({ duration: '' }), 2 * 60 * 60 * 1000);
  assert.equal(parseEventDuration({}), 2 * 60 * 60 * 1000);
});

test('«Сейчас» filter includes soon and live, excludes upcoming and past', () => {
  const soon = { date: '2026-09-25, 12:30', duration: '2 ч' };
  const live = { date: '2026-09-25, 11:30', duration: '2 ч' };
  const upcoming = { date: '2026-09-25, 15:00', duration: '2 ч' };
  const past = { date: '2026-09-25, 09:00', duration: '1 ч' };

  assert.equal(matchesTimeFilter(soon, 'Сейчас', now), true);
  assert.equal(matchesTimeFilter(live, 'Сейчас', now), true);
  assert.equal(matchesTimeFilter(upcoming, 'Сейчас', now), false);
  assert.equal(matchesTimeFilter(past, 'Сейчас', now), false);
});