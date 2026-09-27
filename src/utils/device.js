// src/utils/device.js
// Определяем тип устройства.
// Мобильные/планшеты — с реальной геолокацией.
// Десктопы/ноутбуки — без неё, расстояния считаются от центра города.

export function isMobileOrTablet() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || navigator.vendor || '';
  // iPad с iPadOS 13+ маскируется под Macintosh, но имеет тач-точки.
  if (/Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1) return true;

  return /Android|iPhone|iPod|iPad|Mobile|Tablet|Silk|Kindle/i.test(ua);
}