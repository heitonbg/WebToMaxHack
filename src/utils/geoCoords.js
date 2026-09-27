// src/utils/geoCoords.js
// Единый источник точки отсчёта для расстояний и карты.
// Приоритет: реальная геолокация пользователя → центр выбранного города.

export function getReferenceCoords(userCoords, selectedCity) {
  const hasGeo =
    userCoords &&
    userCoords.lat != null &&
    userCoords.lng != null &&
    Number.isFinite(Number(userCoords.lat)) &&
    Number.isFinite(Number(userCoords.lng));

  if (hasGeo) {
    return {
      lat: Number(userCoords.lat),
      lng: Number(userCoords.lng),
      source: 'geo',
    };
  }

  if (selectedCity?.lat != null && selectedCity?.lng != null) {
    return {
      lat: Number(selectedCity.lat),
      lng: Number(selectedCity.lng),
      source: 'city',
    };
  }

  return null;
}