// src/utils/touristMapLinks.js
import { parseEventDuration, parseEventStart } from './eventFilters.js';

const getEventStartTime = (event) => {
  const startAt = Date.parse(event?.startAt || '');
  if (Number.isFinite(startAt)) return startAt;

  const match = String(event?.date || '').match(/^(\d{4})-(\d{2})-(\d{2})[,\sT]+(\d{1,2}):(\d{2})/);
  if (!match) return parseEventStart(event)?.getTime() ?? Number.POSITIVE_INFINITY;
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5])
  ).getTime();
};

const getEventDateKey = (event) => {
  const start = getEventStartTime(event);
  if (!Number.isFinite(start)) return null;
  const date = new Date(start);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

export function normalizeTouristOption(option) {
  const sourceEvents = Array.isArray(option?.events) ? option.events : [];
  const orderedEvents = [...sourceEvents].sort((left, right) => getEventStartTime(left) - getEventStartTime(right));
  const events = [];
  let previousDate = null;
  let previousEnd = -Infinity;

  for (const event of orderedEvents) {
    const start = getEventStartTime(event);
    if (!Number.isFinite(start)) continue;
    const eventDate = getEventDateKey(event);
    if (eventDate === previousDate && start < previousEnd) continue;
    const duration = Number(event.durationMinutes) > 0
      ? Number(event.durationMinutes) * 60_000
      : parseEventDuration(event);
    events.push(event);
    previousDate = eventDate;
    previousEnd = start + duration;
  }

  const keptIds = new Set(events.map((event) => String(event.id)));
  return {
    ...option,
    events,
    places: (Array.isArray(option?.places) ? option.places : [])
      .filter((place) => keptIds.has(String(place.eventId))),
    removedOverlappingEventCount: Math.max(
      Number(option?.removedOverlappingEventCount) || 0,
      sourceEvents.length - events.length
    ),
  };
}

export function getTouristStopKey(stop) {
  return stop?.kind === 'restaurant' || stop?.kind === 'attraction'
    ? `place:${stop.id}`
    : `event:${stop?.id}`;
}

export function getTouristRouteStops(option) {
  const selectedPlaces = Array.isArray(option?.places) ? option.places : [];
  const events = [...(option?.events || [])].sort((left, right) =>
    getEventStartTime(left) - getEventStartTime(right)
  );
  const eventKeys = new Set(events.map((event) => getTouristStopKey(event)));
  const placesByKey = new Map(selectedPlaces.map((place) => [getTouristStopKey(place), place]));
  const placeSlots = new Map();
  let slot = 0;

  const savedEventOrder = Array.isArray(option?.stopOrder)
    ? option.stopOrder.filter((key) => eventKeys.has(key))
    : [];
  const chronologicalEventOrder = events.map((event) => getTouristStopKey(event));
  const canUseSavedSlots = savedEventOrder.length === chronologicalEventOrder.length &&
    savedEventOrder.every((key, index) => key === chronologicalEventOrder[index]);

  if (canUseSavedSlots) {
    for (const key of option.stopOrder) {
      if (eventKeys.has(key)) {
        slot = Math.min(slot + 1, events.length);
      } else if (placesByKey.has(key) && !placeSlots.has(key)) {
        placeSlots.set(key, slot);
      }
    }
  }

  const placesBySlot = Array.from({ length: events.length + 1 }, () => []);
  for (const place of selectedPlaces) {
    const key = getTouristStopKey(place);
    const linkedEventIndex = events.findIndex((event) => String(event.id) === String(place.eventId));
    const defaultSlot = linkedEventIndex < 0 ? events.length : linkedEventIndex + 1;
    const placeSlot = Math.min(placeSlots.get(key) ?? defaultSlot, events.length);
    placesBySlot[placeSlot].push(place);
  }

  const orderedStops = [];
  for (let index = 0; index < events.length; index += 1) {
    orderedStops.push(...placesBySlot[index], events[index]);
  }
  orderedStops.push(...placesBySlot[events.length]);
  return orderedStops;
}

/**
 * Собирает ссылки на Яндекс.Карты и 2ГИС для туристического маршрута.
 *
 * @param {Array} stops       — события и места маршрута (в порядке посещения)
 * @param {Object} [options]
 * @param {{lat:number,lng:number}|null} [options.userCoords] — координаты пользователя.
 *        Если переданы — маршрут начнётся от них.
 *        Если null — первая точка будет пустой, и карты сами подставят
 *        «моё местоположение» (как в обычных событиях).
 * @param {'auto'|'me'|'route'} [options.mode]
 *        'auto'  — (по умолчанию) от пользователя, если координаты есть; иначе пустая точка;
 *        'me'    — всегда пытаться начать от пользователя (если есть);
 *        'route' — только точки маршрута, без пользователя.
 */
export function buildTouristMapLinks(stops, options = {}) {
  const { userCoords = null, mode = 'auto' } = options;

  const points = [];
  for (const stop of stops || []) {
    if (stop.lat == null || stop.lng == null || stop.lat === '' || stop.lng === '') continue;
    const lat = Number(stop.lat);
    const lng = Number(stop.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (points.some((point) => point.lat === lat && point.lng === lng)) continue;
    points.push({ lat, lng });
  }
  if (!points.length) return null;

  const hasUserCoords =
    userCoords &&
    userCoords.lat != null &&
    userCoords.lng != null &&
    Number.isFinite(Number(userCoords.lat)) &&
    Number.isFinite(Number(userCoords.lng));

  const useUserAsStart = mode !== 'route' && hasUserCoords;

  // Яндекс: "lat,lng~lat,lng~..."  (~ разделяет точки)
  // Если первая секция пустая — Яндекс подставит текущее местоположение.
  const yandexSegments = useUserAsStart
    ? [`${Number(userCoords.lat)},${Number(userCoords.lng)}`]
    : ['']; // пустая первая секция = "от меня"
  for (const { lat, lng } of points) yandexSegments.push(`${lat},${lng}`);
  const yandexRoute = yandexSegments.join('~');

  // 2ГИС: "lng,lat|lng,lat|..."  (| разделяет точки, lng идёт первой)
  // Пустая первая секция — 2ГИС подставит текущее местоположение.
  const twoGisSegments = useUserAsStart
    ? [`${Number(userCoords.lng)},${Number(userCoords.lat)}`]
    : ['']; // пустая первая секция = "от меня"
  for (const { lng, lat } of points) twoGisSegments.push(`${lng},${lat}`);
  const twoGisRoute = twoGisSegments.join('|');

  return {
    yandex: `https://yandex.ru/maps/?rtext=${encodeURIComponent(yandexRoute)}&rtt=auto`,
    twoGis: `https://2gis.ru/directions/points/${twoGisRoute}`,
    points,
    fromUser: useUserAsStart,
  };
}
