// src/utils/citySearch.js
import RAW_CITIES from '../data/russianCities.json';
import { getRegionName } from '../data/ruRegions';

// ============================================
// ИСПРАВЛЕНИЯ ИСТОРИЧЕСКИХ НАЗВАНИЙ
// ============================================
const NAME_FIXES = {
  'Муско': 'Москва',
  'Питер': 'Санкт-Петербург',
  'Казан': 'Казань',
  'Кемерава': 'Кемерово',
  'Тюмен': 'Тюмень',
  'Омбы': 'Омск',
  'Краснояр': 'Красноярск',
  'Царицин': 'Волгоград',
  'Перм': 'Пермь',
  'Толиати': 'Тольятти',
  'Иж': 'Ижевск',
  'Ульск': 'Ульяновск',
  'Чкалов': 'Оренбург',
  'Сталинск': 'Новокузнецк',
  'Свердловск': 'Екатеринбург',
  'Горький': 'Нижний Новгород',
  'Челепи': 'Челябинск',
  'Куйбышев': 'Самара',
  'Брежнев': 'Набережные Челны',
  'Владик': 'Владивосток',
  'Анжи': 'Махачкала',
};

// ============================================
// НОРМАЛИЗАЦИЯ
// ============================================
const normalize = (str) =>
  String(str || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]/g, '');

// Обогащаем города — правим названия и добавляем regionName
const CITIES = RAW_CITIES.map((c) => ({
  ...c,
  name: NAME_FIXES[c.name] || c.name,
  regionName: getRegionName(c.region),
}));

// ============================================
// ИНДЕКСЫ
// ============================================
const byFirstLetter = new Map();
const byPrefix2 = new Map();
const byExactName = new Map();

const TOP_CITIES = [...CITIES]
  .sort((a, b) => (b.population || 0) - (a.population || 0))
  .slice(0, 60);

(function buildIndexes() {
  for (const city of CITIES) {
    const norm = normalize(city.name);
    if (!norm) continue;

    const first = norm[0];
    if (!byFirstLetter.has(first)) byFirstLetter.set(first, []);
    byFirstLetter.get(first).push(city);

    if (norm.length >= 2) {
      const p2 = norm.slice(0, 2);
      if (!byPrefix2.has(p2)) byPrefix2.set(p2, []);
      byPrefix2.get(p2).push(city);
    }

    if (!byExactName.has(norm)) byExactName.set(norm, []);
    byExactName.get(norm).push(city);
  }
})();

// ============================================
// ПОИСК
// ============================================
export function searchCities(query, limit = 50) {
  const q = normalize(query);
  if (!q) return TOP_CITIES.slice(0, limit);

  const pool = q.length === 1
    ? (byFirstLetter.get(q[0]) || [])
    : (byPrefix2.get(q.slice(0, 2)) || []);

  const results = [];

  for (const city of pool) {
    const name = normalize(city.name);
    if (!name.includes(q)) continue;

    let score = 0;
    if (name === q) score = 10000;
    else if (name.startsWith(q)) score = 5000;
    else score = 1000 - name.indexOf(q);

    score += Math.log10((city.population || 0) + 1) * 100;

    if (city.type === 'столица') score += 500;
    else if (city.type === 'город') score += 200;
    else if (city.type === 'пгт') score += 50;

    results.push({ city, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit).map((r) => r.city);
}

export function findCityByName(name) {
  // Старый localStorage мог сохранить название из прежнего, повреждённого
  // справочника. Канонизируем и ввод пользователя, и сохранённое значение.
  const n = normalize(NAME_FIXES[name] || name);
  const list = byExactName.get(n);
  if (!list || !list.length) return null;
  return [...list].sort((a, b) => (b.population || 0) - (a.population || 0))[0];
}

export function getTopCities(limit = 20) {
  return TOP_CITIES.slice(0, limit);
}

export function getAllCities() {
  return CITIES;
}

export function getCityCount() {
  return CITIES.length;
}

// ============================================
// ★★★ БЛИЖАЙШИЙ ГОРОД К ТОЧКЕ ★★★
// ============================================
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Найти ближайший город к точке.
 * @param {number} lat
 * @param {number} lng
 * @param {number} maxDistanceKm — если ближе этого нет, вернёт null
 * @returns {{ city: object, distance: number } | null}
 */
export function findNearestCity(lat, lng, maxDistanceKm = 150) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  let best = null;
  let bestDist = Infinity;

  for (const city of CITIES) {
    if (!Number.isFinite(city.lat) || !Number.isFinite(city.lng)) continue;

    // Быстрый отсев по bounding box (≈1° ≈ 111 км)
    const dLat = Math.abs(city.lat - lat);
    const dLng = Math.abs(city.lng - lng);
    if (dLat > 2 || dLng > 3) continue;

    const dist = haversine(city.lat, city.lng, lat, lng);
    if (dist < bestDist) {
      bestDist = dist;
      best = city;
    }
  }

  if (!best || bestDist > maxDistanceKm) return null;
  return { city: best, distance: bestDist };
}
