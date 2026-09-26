// src/utils/eventFilters.js
import { haversineDistance } from './distance.js';

// ============================================
// ПАРСИНГ ДАТЫ И ВРЕМЕНИ
// ============================================

export function parseEventStart(event, now = new Date()) {
  const raw = String(event?.date || '').trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T,\s]+(\d{1,2}):(\d{2}))?/);
  const time = raw.match(/(\d{1,2}):(\d{2})/);

  if (iso) {
    const date = new Date(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3]),
      Number(iso[4] ?? time?.[1] ?? 0),
      Number(iso[5] ?? time?.[2] ?? 0)
    );
    if (
      date.getFullYear() === Number(iso[1]) &&
      date.getMonth() === Number(iso[2]) - 1 &&
      date.getDate() === Number(iso[3])
    ) {
      return date;
    }
    return null;
  }

  if (/сегодня|завтра/i.test(raw)) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      Number(time?.[1] ?? 0),
      Number(time?.[2] ?? 0)
    );
    if (/завтра/i.test(raw)) date.setDate(date.getDate() + 1);
    return date;
  }

  return null;
}

/**
 * Длительность события в миллисекундах.
 * Поддерживает: "3 ч", "3 ч 30 мин", "45 мин", 180 (число → минуты), "180" (строка → минуты).
 * Если duration не указан — возвращает 2 часа по умолчанию.
 */
export function parseEventDuration(event) {
  const DEFAULT = 2 * 60 * 60 * 1000;
  const raw = event?.duration;
  if (raw == null || raw === '') return DEFAULT;

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw > 0 ? raw * 60 * 1000 : DEFAULT;
  }

  const str = String(raw).trim();
  if (!str) return DEFAULT;

  if (/^\d+$/.test(str)) {
    const minutes = Number(str);
    return minutes > 0 ? minutes * 60 * 1000 : DEFAULT;
  }

  const h = Number(str.match(/(\d+)\s*ч/)?.[1] || 0);
  const m = Number(str.match(/(\d+)\s*мин/)?.[1] || 0);
  const ms = (h * 60 + m) * 60 * 1000;
  return ms > 0 ? ms : DEFAULT;
}

export function parseEventEnd(event, now = new Date()) {
  const start = parseEventStart(event, now);
  if (!start) return null;
  return new Date(start.getTime() + parseEventDuration(event));
}

// ============================================
// СТАТУС СОБЫТИЯ
// ============================================
// upcoming — больше часа до начала
// soon     — час или меньше до начала
// live     — идёт сейчас
// past     — уже закончилось
// unknown  — не удалось распарсить дату

export function getEventStatus(event, now = new Date()) {
  const start = parseEventStart(event, now);
  if (!start) return 'unknown';

  const end = parseEventEnd(event, now);
  const t = now.getTime();
  const startMs = start.getTime();
  const endMs = end ? end.getTime() : startMs + 2 * 60 * 60 * 1000;
  const HOUR = 60 * 60 * 1000;

  if (t >= endMs) return 'past';
  if (t >= startMs) return 'live';
  if (t >= startMs - HOUR) return 'soon';
  return 'upcoming';
}

export const EVENT_STATUS_LABELS = {
  upcoming: '',
  soon: 'Скоро',
  live: 'Идёт сейчас',
  past: 'Завершено',
  unknown: '',
};

// ============================================
// ФИЛЬТРЫ ВРЕМЕНИ
// ============================================

export function matchesTimeFilter(event, filter, now = new Date()) {
  if (!filter) return true;

  const start = parseEventStart(event, now);
  if (!start) return false;

  if (filter === 'Сейчас') {
    const status = getEventStatus(event, now);
    return status === 'soon' || status === 'live';
  }

  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === 'Завтра') target.setDate(target.getDate() + 1);
  if (filter !== 'Сегодня' && filter !== 'Завтра') return false;

  return (
    start.getFullYear() === target.getFullYear() &&
    start.getMonth() === target.getMonth() &&
    start.getDate() === target.getDate()
  );
}

// ============================================
// ФОРМАТ
// ============================================

export function isOnlineEvent(event) {
  return event.format === 'Онлайн' || event.district === 'Онлайн';
}

// ============================================
// РАССТОЯНИЕ
// ============================================

export function getEventDistanceKm(event, userCoords) {
  if (isOnlineEvent(event)) return Infinity;
  if (
    userCoords &&
    event.lat != null &&
    event.lng != null &&
    Number.isFinite(Number(event.lat)) &&
    Number.isFinite(Number(event.lng))
  ) {
    return haversineDistance(userCoords.lat, userCoords.lng, Number(event.lat), Number(event.lng));
  }
  const value = Number.parseFloat(String(event.distance ?? '').replace(',', '.'));
  if (value === 0 && userCoords == null) return Infinity;
  return Number.isFinite(value) ? value : Infinity;
}

// ============================================
// СВОДНЫЙ ФИЛЬТР
// ============================================

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
    const maxKm = Number.parseFloat(
      String(filters.distance).replace(',', '.').match(/[\d.]+/)?.[0] ?? ''
    );
    if (!Number.isFinite(maxKm) || getEventDistanceKm(event, userCoords) > maxKm) return false;
  }

  if (filters.pushkinCard && event.price !== 'Пушкинская карта') return false;

  return true;
}