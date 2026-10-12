// src/utils/defaultEventImages.js
// Единый источник дефолтных картинок по категориям событий.

export const DEFAULT_EVENT_IMAGES = {
  'Спорт': '/defaults/sport.jpg',
  'Музыка': '/defaults/music.jpg',
  'Культура': '/defaults/culture.jpg',
  'Кино': '/defaults/cinema.jpg',
  'Настольные игры': '/defaults/board-games.jpg',
  'Прогулка': '/defaults/walk.jpg',
  'Волонтёрство': '/defaults/volunteering.jpg',
  'Другое': '/defaults/default.jpg',
};

export const FALLBACK_EVENT_IMAGE = '/defaults/default.jpg';

export function getDefaultEventImage(category) {
  if (!category) return FALLBACK_EVENT_IMAGE;
  return DEFAULT_EVENT_IMAGES[category] || FALLBACK_EVENT_IMAGE;
}

export function resolveEventImage(event) {
  if (!event) return FALLBACK_EVENT_IMAGE;
  const own = event.image || (Array.isArray(event.images) && event.images[0]);
  if (own && typeof own === 'string' && own.trim()) return own;
  return getDefaultEventImage(event.category);
}