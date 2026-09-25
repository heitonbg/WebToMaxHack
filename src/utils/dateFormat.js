export function formatEventDate(value, now = new Date()) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:,?\s*(\d{1,2}:\d{2}))?/);
  if (!match) return raw;

  const [, year, month, day, time] = match;
  const eventDate = new Date(Number(year), Number(month) - 1, Number(day));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOffset = Math.round((eventDate - today) / 86400000);
  const dayLabel = dayOffset === 0
    ? 'Сегодня'
    : dayOffset === 1
      ? 'Завтра'
      : new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(eventDate);
  const normalizedTime = time && time.length === 4 ? `0${time}` : time;
  return [dayLabel, normalizedTime].filter(Boolean).join(', ');
}
