export const haversineDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const formatDistance = (km) => {
  if (km === 0) return '0 км';
  if (km == null) return '';
  if (km < 1) return `${Math.round(km * 1000)} м`;
  return `${km.toFixed(1)} км`;
};

export const obfuscateCoordinates = (lat, lng, isTrusted) => {
  if (isTrusted || lat == null || lng == null) return { lat, lng };
  return {
    lat: Math.round(lat * 1000) / 1000,
    lng: Math.round(lng * 1000) / 1000,
  };
};

// ★ Относится ли событие к выбранному городу (в радиусе radiusKm от центра)
export const eventBelongsToCity = (event, city, radiusKm = 40) => {
  if (!event || !city) return false;
  // Онлайн-события показываем везде
  if (event.format === 'Онлайн' || event.district === 'Онлайн') return true;
  if (event.lat == null || event.lng == null) return false;
  if (city.lat == null || city.lng == null) return false;
  const dist = haversineDistance(event.lat, event.lng, city.lat, city.lng);
  return dist != null && dist <= radiusKm;
};