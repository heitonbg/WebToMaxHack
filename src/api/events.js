// src/api/events.js
import { isEventOwner } from '../utils/eventOwnership.js';
import { maxBridge } from '../utils/maxBridge.js';

const configuredApiUrl = String(import.meta.env?.VITE_API_URL || '').trim().replace(/\/+$/, '');
const API = configuredApiUrl || 'https://maxserver-iwrawww.msk1.amvera.tech';

// ============================================
// БАЗОВЫЙ FETCH
// ============================================
const apiFetch = async (path, options = {}) => {
  const { timeoutMs = 12000, headers: extraHeaders = {}, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API}${path}`, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      let errorMessage = `Ошибка ${res.status}`;
      try {
        const payload = await res.json();
        errorMessage = payload.error || errorMessage;
        if (payload.code) errorMessage = `${errorMessage} (${payload.code})`;
      } catch {}
      throw new Error(errorMessage);
    }
    return res.status === 204 ? { success: true } : res.json();
  } catch (error) {
    if (error?.name === 'AbortError')
      throw new Error(`Сервер не ответил за ${Math.round(timeoutMs / 1000)} секунд. Попробуйте ещё раз.`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

// ============================================
// BOOTSTRAP
// ============================================
export const fetchBootstrap = async (userId) => {
  if (!userId) return { user: null, joinedIds: [], participatedIds: [], createdIds: [] };
  return apiFetch(`/api/bootstrap?userId=${encodeURIComponent(userId)}`);
};

// ============================================
// EVENTS
// ============================================
export const fetchEvents = async (filters = {}) => {
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v != null && v !== '')
  ).toString();
  return apiFetch(params ? `/api/events?${params}` : '/api/events');
};

export const fetchJoinedIds = async (userId) => {
  if (!userId) return [];
  const data = await apiFetch(`/api/events/joined?userId=${encodeURIComponent(userId)}`);
  return data.eventIds || [];
};

export const fetchParticipatedIds = async (userId) => {
  if (!userId) return [];
  const data = await apiFetch(`/api/events/participated?userId=${encodeURIComponent(userId)}`);
  return data.eventIds || [];
};

export const fetchParticipants = async (eventId) => {
  const data = await apiFetch(`/api/events/${eventId}/participants`);
  return data.participants || [];
};

export const fetchUser = async (userId) => {
  try {
    return await apiFetch(`/api/users/${encodeURIComponent(userId)}`);
  } catch (e) {
    if (String(e.message).includes('404')) return null;
    throw e;
  }
};

export const updateUser = async (userId, patch) => {
  return apiFetch(`/api/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
};

export const createEvent = async (eventData) => {
  return apiFetch('/api/events', { method: 'POST', body: JSON.stringify(eventData) });
};

export const updateEvent = async (eventId, eventData, userId) => {
  return apiFetch(`/api/events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify({ ...eventData, userId }),
  });
};

export const joinEvent = async (eventId, userId, userProfile) => {
  return apiFetch(`/api/events/${eventId}/join`, {
    method: 'POST',
    body: JSON.stringify({ userId, userProfile }),
  });
};

export const leaveEvent = async (eventId, userId) => {
  return apiFetch(`/api/events/${eventId}/leave`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
};

export const deleteEvent = async (eventId, userId) => {
  return apiFetch(`/api/events/${eventId}?userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
};

export const reportEvent = async (eventId, reason, reporterId) => {
  return apiFetch('/api/reports', {
    method: 'POST',
    body: JSON.stringify({ eventId, reason, reporterId }),
  });
};

// ============================================
// UPLOAD
// ============================================
export const uploadImages = async (files) => {
  const fd = new FormData();
  files.forEach((f) => fd.append('photos', f));
  const res = await fetch(`${API}/api/upload`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Не удалось загрузить фото');
  const data = await res.json();
  return (data.urls || []).map((u) => `${API}${u}`);
};

// ============================================
// HEALTH
// ============================================
export const checkHealth = async () => {
  try {
    return await apiFetch('/health');
  } catch (e) {
    return { status: 'error', message: e.message };
  }
};

// ============================================
// TOURIST
// ============================================
export const generateTouristPlan = async (request) =>
  apiFetch('/api/tourist/plan', {
    method: 'POST',
    body: JSON.stringify(request),
    timeoutMs: 30000,
  });

export const searchTouristPlaces = async ({ eventIds, kind }) =>
  apiFetch('/api/tourist/places', {
    method: 'POST',
    body: JSON.stringify({ eventIds, kind }),
    timeoutMs: 20000,
  });

export const recommendTouristPlaces = async ({ eventIds, kind }) =>
  apiFetch('/api/tourist/recommendations', {
    method: 'POST',
    body: JSON.stringify({ eventIds, kind }),
    timeoutMs: 30000,
  });

export const searchTouristPlacesByText = async ({ eventIds, query }) =>
  apiFetch('/api/tourist/search-places', {
    method: 'POST',
    body: JSON.stringify({ eventIds, query }),
    timeoutMs: 15000,
  });

export const geocodeTouristAddress = async (query) =>
  apiFetch(`/api/cities/address?q=${encodeURIComponent(query)}`, { timeoutMs: 10000 });

const touristPlanRequest = (path, options = {}) => {
  const initData = maxBridge.getInitData();
  if (!initData) throw new Error('Откройте мини-приложение в MAX, чтобы синхронизировать маршрут.');
  return apiFetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: `tma ${initData}`,
    },
  });
};

export const fetchTouristPlans = () => touristPlanRequest('/api/tourist/plans');

export const saveTouristPlan = (plan) => touristPlanRequest('/api/tourist/plans', {
  method: 'PUT',
  body: JSON.stringify({ plan }),
});

export const deleteTouristPlan = ({ city, date }) => touristPlanRequest('/api/tourist/plans', {
  method: 'DELETE',
  body: JSON.stringify({ city, date }),
});

export const reverseGeocode = async (lat, lng) => {
  return apiFetch(
    `/api/cities/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
  );
};

// ============================================
// REVIEWS
// ============================================
export const fetchReviews = async (eventId) => {
  return apiFetch(`/api/events/${eventId}/reviews`);
};

export const addReview = async (review) => {
  return apiFetch(`/api/events/${review.eventId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(review),
  });
};

// ============================================
// FRIENDS (без моков)
// ============================================
export const fetchFriends = async (userId) => {
  if (!userId) return { friends: [], incoming: [], outgoing: [] };
  return apiFetch(`/api/friends?userId=${encodeURIComponent(userId)}`);
};

export const fetchFriendStatus = async (userId, otherId) => {
  if (!userId || !otherId) return { status: 'none' };
  return apiFetch(
    `/api/friends/status?userId=${encodeURIComponent(userId)}&otherId=${encodeURIComponent(otherId)}`
  );
};

export const sendFriendRequest = async (fromId, toId) => {
  return apiFetch('/api/friends/request', {
    method: 'POST',
    body: JSON.stringify({ fromId, toId }),
  });
};

// алиас для совместимости с FriendsPage
export const requestFriend = sendFriendRequest;

export const acceptFriendRequest = async (userId, fromId) => {
  return apiFetch('/api/friends/accept', {
    method: 'POST',
    body: JSON.stringify({ userId, fromId }),
  });
};

// алиас для совместимости с FriendsPage
export const acceptFriend = acceptFriendRequest;

export const declineFriendRequest = async (userId, fromId) => {
  return apiFetch('/api/friends/decline', {
    method: 'POST',
    body: JSON.stringify({ userId, fromId }),
  });
};

// алиас для совместимости с FriendsPage
export const declineFriend = declineFriendRequest;

export const removeFriend = async (userId, friendId) => {
  return apiFetch(
    `/api/friends/${encodeURIComponent(friendId)}?userId=${encodeURIComponent(userId)}`,
    { method: 'DELETE' }
  );
};

export { openMaxChat } from '../utils/maxBridge.js';