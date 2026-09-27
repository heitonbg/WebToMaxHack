import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTouristMapLinks, getTouristRouteStops, normalizeTouristOption } from './touristMapLinks.js';

test('route stops place selected OSM places after their attached events', () => {
  const stops = getTouristRouteStops({
    events: [{ id: 1, title: 'Museum' }, { id: 2, title: 'Cinema' }],
    places: [{ id: 'osm-3', name: 'Cafe', eventId: 1 }],
  });

  assert.deepEqual(stops.map((stop) => stop.id), [1, 'osm-3', 2]);
});

test('route stop order overrides the default event-place order and appends new stops', () => {
  const stops = getTouristRouteStops({
    events: [{ id: 1 }, { id: 2 }],
    places: [{ id: 'osm-3', name: 'Cafe', kind: 'restaurant', eventId: 1 }],
    stopOrder: ['event:2', 'place:osm-3'],
  });

  assert.deepEqual(stops.map((stop) => stop.id), [1, 'osm-3', 2]);
});

test('events stay in chronological order even if saved stop order is reversed', () => {
  const stops = getTouristRouteStops({
    events: [
      { id: 2, date: '2026-09-25, 13:30' },
      { id: 1, date: '2026-09-25, 12:00' },
    ],
    stopOrder: ['event:2', 'event:1'],
  });

  assert.deepEqual(stops.map((stop) => stop.id), [1, 2]);
});

test('legacy plans remove overlapping events and keep the remaining events chronological', () => {
  const option = normalizeTouristOption({
    events: [
      { id: 2, date: '2026-09-25, 13:30', duration: '1 ч' },
      { id: 1, date: '2026-09-25, 12:00', duration: '3 ч' },
      { id: 3, date: '2026-09-25, 17:00', duration: '1 ч' },
    ],
    places: [{ id: 'osm-1', eventId: 2 }, { id: 'osm-2', eventId: 1 }],
  });

  assert.deepEqual(option.events.map((event) => event.id), [1, 3]);
  assert.deepEqual(option.places.map((place) => place.id), ['osm-2']);
  assert.equal(option.removedOverlappingEventCount, 1);
});

test('map links preserve every valid stop and omit duplicate or invalid coordinates', () => {
  const links = buildTouristMapLinks([
    { lat: 55.75, lng: 37.61 },
    { lat: 55.75, lng: 37.61 },
    { lat: 59.93, lng: 30.31 },
    { lat: null, lng: null },
  ]);

  assert.equal(links.points.length, 2);
  assert.match(decodeURIComponent(links.yandex), /55\.75,37\.61~59\.93,30\.31/);
  assert.match(links.twoGis, /37\.61,55\.75\|30\.31,59\.93/);
  assert.equal(buildTouristMapLinks([{ lat: 55, lng: 37 }]), null);
});
