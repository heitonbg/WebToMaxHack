const FOOT_ROUTER_URL = 'https://routing.openstreetmap.de/routed-foot/route/v1/driving';

export async function fetchFootRoute(points, { fetchImpl = fetch, signal } = {}) {
  const validPoints = (points || []).filter((point) =>
    point?.lat != null && point?.lng != null &&
    Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng))
  );
  if (validPoints.length < 2) return null;

  const coordinates = validPoints
    .map((point) => `${Number(point.lng)},${Number(point.lat)}`)
    .join(';');
  const url = `${FOOT_ROUTER_URL}/${coordinates}?overview=full&geometries=geojson&steps=false`;
  const response = await fetchImpl(url, { signal });
  if (!response.ok) throw new Error(`Маршрутизатор ответил с ошибкой ${response.status}`);

  const data = await response.json();
  const route = data.routes?.[0];
  if (data.code !== 'Ok' || !Array.isArray(route?.geometry?.coordinates)) {
    throw new Error('Не удалось построить пеший маршрут по дорогам между всеми точками');
  }

  return {
    coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
}