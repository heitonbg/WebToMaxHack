// src/utils/touristMapLinks.js

export function getTouristRouteStops(option) {
  const selectedPlaces = Array.isArray(option?.places) ? option.places : [];
  return (option?.events || []).flatMap((event) => [
    event,
    ...selectedPlaces.filter((place) => String(place.eventId) === String(event.id)),
  ]);
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
