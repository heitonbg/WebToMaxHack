// src/utils/dateFormat.js
import { getEventStatus, EVENT_STATUS_LABELS } from './eventFilters.js';

/**
 * Форматирует дату события относительно текущего момента.
 *
 * Возможные варианты:
 *   "Сегодня, 19:00"
 *   "Завтра, 12:00"
 *   "5 окт., 18:00"
 *   "5 окт. 2025, 18:00"  — если год отличается
 *   "Завершено"           — если событие уже прошло
 */
export function formatEventDate(value, now = new Date()) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:,?\s*(\d{1,2}:\d{2}))?/);

  if (!match) {
    // Не ISO — например, "Сегодня, 19:00". Проверяем только статус.
    return raw;
  }

  const [, year, month, day, time] = match;
  const eventDate = new Date(Number(year), Number(month) - 1, Number(day));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOffset = Math.round((eventDate - today) / 86400000);

  const status = getEventStatus({ date: raw }, now);
  if (status === 'past') return EVENT_STATUS_LABELS.past; // "Завершено"

  let dayLabel;
  if (dayOffset === 0) dayLabel = 'Сегодня';
  else if (dayOffset === 1) dayLabel = 'Завтра';
  else if (dayOffset === -1) dayLabel = 'Вчера';
  else {
    const sameYear = eventDate.getFullYear() === now.getFullYear();
    dayLabel = new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      ...(sameYear ? {} : { year: 'numeric' }),
    }).format(eventDate);
  }

  const normalizedTime = time && time.length === 4 ? `0${time}` : time;
  return [dayLabel, normalizedTime].filter(Boolean).join(', ');
}