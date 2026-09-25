// src/utils/storage.js
const KEYS = {
  liked: 'max_events_liked_v1',
  notifications: 'max_events_notifications_v1',
  sort: 'max_events_sort_v1',
  theme: 'max_events_theme_v1',
  profile: 'max_events_profile_v1',
};

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

export const storage = {
  getLiked: () => read(KEYS.liked, []),
  setLiked: (ids) => write(KEYS.liked, ids),

  getNotifications: () => read(KEYS.notifications, true),
  setNotifications: (v) => write(KEYS.notifications, v),

  getSort: () => read(KEYS.sort, 'distance'),
  setSort: (v) => write(KEYS.sort, v),

  getTheme: () => {
    try {
      return ['dark', '"dark"'].includes(localStorage.getItem(KEYS.theme)) ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  },
  setTheme: (v) => write(KEYS.theme, v),

  getProfile: (userId) => read(`${KEYS.profile}_${userId}`, {}),
  setProfile: (userId, profile) => write(`${KEYS.profile}_${userId}`, profile),

  // Migration: чистим старый ключ joined, если он остался
  cleanupLegacy() {
    try {
      localStorage.removeItem('max_events_joined_v1');
    } catch {}
  },
};