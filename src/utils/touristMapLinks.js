export function getTouristRouteStops(option) {
  const selectedPlaces = Array.isArray(option?.places) ? option.places : [];
  return (option?.events || []).flatMap((event) => [
    event,
    ...selectedPlaces.filter((place) => String(place.eventId) === String(event.id)),
  ]);
}

export function buildTouristMapLinks(stops) {
  const points = [];
  for (const stop of stops || []) {
    if (stop.lat == null || stop.lng == null || stop.lat === '' || stop.lng === '') continue;
    const lat = Number(stop.lat);
    const lng = Number(stop.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (points.some((point) => point.lat === lat && point.lng === lng)) continue;
    points.push({ lat, lng });
  }
  if (points.length < 2) return null;

  const yandexRoute = points.map(({ lat, lng }) => `${lat},${lng}`).join('~');
  const twoGisRoute = points.map(({ lat, lng }) => `${lng},${lat}`).join('|');
  return {
    yandex: `https://yandex.ru/maps/?rtext=${encodeURIComponent(yandexRoute)}&rtt=auto`,
    twoGis: `https://2gis.ru/directions/points/${twoGisRoute}`,
    points,
  };
}
