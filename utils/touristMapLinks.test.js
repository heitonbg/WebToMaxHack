import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTouristMapLinks, getTouristRouteStops } from './touristMapLinks.js';

test('route stops place selected OSM places after their attached events', () => {
  const stops = getTouristRouteStops({
    events: [{ id: 1, title: 'Museum' }, { id: 2, title: 'Cinema' }],
    places: [{ id: 'osm-3', name: 'Cafe', eventId: 1 }],
  });

  assert.deepEqual(stops.map((stop) => stop.id), [1, 'osm-3', 2]);
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
