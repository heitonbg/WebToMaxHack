import { parseEventDuration, parseEventStart } from './eventFilters.js';
import { isTouristPlace } from './touristMapLinks.js';

const DEFAULT_PLACE_DURATIONS = {
  restaurant: 45,
  attraction: 60,
};

const dateKey = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');

const atStartOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const placeStartFromTime = (time, date) => {
  const match = String(time || '').match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes
  );
};

export function getTouristRouteSchedule(stops, { defaultDate, now = new Date() } = {}) {
  const items = Array.isArray(stops) ? stops : [];
  const firstEventStart = items
    .filter((stop) => !isTouristPlace(stop))
    .map((stop) => parseEventStart(stop, now))
    .find(Boolean);
  const parsedDefaultDate = defaultDate ? parseEventStart({ date: defaultDate }, now) : null;
  const routeDate = firstEventStart || parsedDefaultDate || now;
  const cursors = new Map();
  const schedule = [];
  let previousScheduledDate = routeDate;

  items.forEach((stop) => {
    const isPlace = isTouristPlace(stop);
    const durationMinutes = isPlace
      ? Math.max(15, Math.min(240, Number(stop.durationMinutes) || DEFAULT_PLACE_DURATIONS[stop.kind] || 60))
      : Math.round(parseEventDuration(stop) / 60_000);
    const placeTimeDate = isPlace && stop.startTime
      ? placeStartFromTime(stop.startTime, previousScheduledDate)
      : null;
    const fixedStart = isPlace ? placeTimeDate : parseEventStart(stop, now);
    const stopDate = fixedStart || previousScheduledDate;
    previousScheduledDate = stopDate;
    const key = dateKey(stopDate);
    const previousEnd = cursors.get(key);
    const start = fixedStart || previousEnd || new Date(
      stopDate.getFullYear(), stopDate.getMonth(), stopDate.getDate(), 9, 0
    );
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    const overlapsPrevious = Boolean(fixedStart && previousEnd && previousEnd > fixedStart);
    const currentCursor = cursors.get(key);
    if (!currentCursor || end > currentCursor) cursors.set(key, end);

    schedule.push({ start, end, durationMinutes, isPlace, overlapsPrevious, overlapsNext: false });
  });

  for (let index = 0; index < items.length; index += 1) {
    if (!schedule[index].isPlace) continue;
    const nextEventIndex = items.findIndex((stop, candidateIndex) =>
      candidateIndex > index && !isTouristPlace(stop)
    );
    if (nextEventIndex < 0) continue;
    const nextEventStart = parseEventStart(items[nextEventIndex], now);
    if (nextEventStart && dateKey(nextEventStart) === dateKey(schedule[index].start) && schedule[index].end > nextEventStart) {
      schedule[index].overlapsNext = true;
    }
  }

  return schedule;
}