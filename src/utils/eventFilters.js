import { haversineDistance } from './distance.js';

export function parseEventStart(event, now = new Date()) {
  const raw = String(event?.date || '').trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T,\s]+(\d{1,2}):(\d{2}))?/);
  const time = raw.match(/(\d{1,2}):(\d{2})/);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), Number(iso[4] ?? time?.[1] ?? 0), Number(iso[5] ?? time?.[2] ?? 0));
    if (date.getFullYear() === Number(iso[1]) && date.getMonth() === Number(iso[2]) - 1 && date.getDate() === Number(iso[3])) return date;
    return null;
  }
  if (/сегодня|завтра/i.test(raw)) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(time?.[1] ?? 0), Number(time?.[2] ?? 0));
    if (/завтра/i.test(raw)) date.setDate(date.getDate() + 1);
    return date;
  }
  return null;
}

export function matchesTimeFilter(event, filter, now = new Date()) {
  if (!filter) return true;
  const start = parseEventStart(event, now);
  if (!start) return false;
  if (filter === 'Сейчас') return start.getTime() >= now.getTime() && start.getTime() <= now.getTime() + 60 * 60 * 1000;
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === 'Завтра') target.setDate(target.getDate() + 1);
  if (filter !== 'Сегодня' && filter !== 'Завтра') return false;
  return start.getFullYear() === target.getFullYear() &&
    start.getMonth() === target.getMonth() &&
    start.getDate() === target.getDate();
}

export function isOnlineEvent(event) {
  return event.format === 'Онлайн' || event.district === 'Онлайн';
}

export function getEventDistanceKm(event, userCoords) {
  if (isOnlineEvent(event)) return Infinity;
  if (userCoords && event.lat != null && event.lng != null && Number.isFinite(Number(event.lat)) && Number.isFinite(Number(event.lng))) {
    return haversineDistance(userCoords.lat, userCoords.lng, Number(event.lat), Number(event.lng));
  }
  const value = Number.parseFloat(String(event.distance ?? '').replace(',', '.'));
  return Number.isFinite(value) ? value : Infinity;
}

export function matchesConfiguredFilters(event, filters, userCoords, now = new Date()) {
  if (!filters) return true;
  if (filters.category?.length && !filters.category.includes(event.category)) return false;
  if (filters.price) {
    if (filters.price === 'Платно' && event.price === 'Бесплатно') return false;
    if (filters.price !== 'Платно' && event.price !== filters.price) return false;
  }
  if (filters.format === 'Онлайн' && !isOnlineEvent(event)) return false;
  if (filters.format === 'Офлайн' && isOnlineEvent(event)) return false;
  if (filters.time && !matchesTimeFilter(event, filters.time, now)) return false;
  if (filters.distance) {
    const maxKm = Number.parseFloat(String(filters.distance).replace(',', '.').match(/[\d.]+/)?.[0] ?? '');
    if (!Number.isFinite(maxKm) || getEventDistanceKm(event, userCoords) > maxKm) return false;
  }
  if (filters.pushkinCard && event.price !== 'Пушкинская карта') return false;
  return true;
}
