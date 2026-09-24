import { MOCK_EVENTS } from '../data/mockEvents.js';
import { isEventOwner } from '../utils/eventOwnership.js';

// ============================================
// ★★★ ГЛАВНЫЙ ПЕРЕКЛЮЧАТЕЛЬ ★★★
// VITE_USE_MOCK=true   → моковые данные (в памяти)
// VITE_USE_MOCK=false  → реальный API (сервер + БД)
// По умолчанию — mock.
// ============================================
const USE_MOCK = import.meta.env?.VITE_USE_MOCK !== 'false';
const API = import.meta.env?.VITE_API_URL || 'https://maxserver-iwrawww.amvera.io';

// ============ МОКОВЫЕ ДАННЫЕ (в памяти) ============
let mockEvents = [...MOCK_EVENTS];
const mockJoins = new Map();   // eventId -> Set(userId)
let mockReviews = [];          // { id, eventId, userId, userName, rating, text, createdAt }
const mockUsers = {};          // ★ userId -> профиль

// ============ API ============
const apiFetch = async (path, options = {}) => {
  const res = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });
  if (!res.ok) {
    let errorMessage = `Ошибка ${res.status}`;
    try { errorMessage = (await res.json()).error || errorMessage; } catch {}
    throw new Error(errorMessage);
  }
  return res.status === 204 ? { success: true } : res.json();
};

// ============ EVENTS ============
export const fetchEvents = async (filters = {}) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 150));
    return mockEvents.map((e) => ({
      ...e,
      participants: Math.max(e.participants || 1, 1 + (mockJoins.get(e.id)?.size || 0)),
      organizer: e.organizer || (e.organizerId ? mockUsers[String(e.organizerId)] : null),
    }));
  }
  const params = new URLSearchParams(filters).toString();
  return apiFetch(params ? `/api/events?${params}` : '/api/events');
};

export const fetchJoinedIds = async (userId) => {
  if (USE_MOCK) {
    const ids = [];
    for (const [eventId, users] of mockJoins.entries()) {
      if (users.has(String(userId))) ids.push(eventId);
    }
    return ids;
  }
  const data = await apiFetch(`/api/events/joined?userId=${encodeURIComponent(userId)}`);
  return data.eventIds || [];
};

// ★ Участники события: возвращает { participants, organizerId }
export const fetchParticipants = async (eventId) => {
  if (USE_MOCK) {
    const ids = mockJoins.get(eventId) || new Set();
    const organizerId = mockEvents.find((e) => e.id === eventId)?.organizerId || null;
    const participants = [...ids].map(
      (id) => mockUsers[String(id)] || { id, name: 'Участник' }
    );
    // Организатор — первым
    if (organizerId) {
      const idx = participants.findIndex((p) => String(p.id) === String(organizerId));
      if (idx > 0) {
        const [org] = participants.splice(idx, 1);
        participants.unshift(org);
      }
    }
    return { participants, organizerId: organizerId ? String(organizerId) : null };
  }
  const data = await apiFetch(`/api/events/${eventId}/participants`);
  return {
    participants: data.participants || [],
    organizerId: data.organizerId ? String(data.organizerId) : null,
  };
};

// ★ Профиль пользователя
export const fetchUser = async (userId) => {
  if (USE_MOCK) {
    return mockUsers[String(userId)] || null;
  }
  try {
    return await apiFetch(`/api/users/${encodeURIComponent(userId)}`);
  } catch (e) {
    if (String(e.message).includes('404')) return null;
    throw e;
  }
};

// ★ Обновить профиль
export const updateUser = async (userId, patch) => {
  if (USE_MOCK) {
    mockUsers[String(userId)] = {
      ...(mockUsers[String(userId)] || { id: String(userId) }),
      ...patch,
      id: String(userId),
    };
    return mockUsers[String(userId)];
  }
  return apiFetch(`/api/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch)
  });
};

export const createEvent = async (eventData) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 200));
    const newEvent = {
      ...eventData,
      id: Date.now(),
      participants: 1,
      rating: 0,
      reviewsCount: 0,
      createdAt: new Date().toISOString()
    };
    mockEvents = [newEvent, ...mockEvents];

    // ★ Организатор сразу считается участником
    const orgId = String(eventData.organizerId || eventData.organizer?.id || '');
    if (orgId) {
      if (!mockJoins.has(newEvent.id)) mockJoins.set(newEvent.id, new Set());
      mockJoins.get(newEvent.id).add(orgId);
    }

    return newEvent;
  }
  return apiFetch('/api/events', { method: 'POST', body: JSON.stringify(eventData) });
};

export const updateEvent = async (eventId, eventData, userId) => {
  if (USE_MOCK) {
    const current = mockEvents.find((e) => e.id === eventId);
    if (!current) throw new Error('Событие не найдено');
    if (!isEventOwner(current, userId)) throw new Error('Редактировать может только организатор');
    await new Promise((r) => setTimeout(r, 150));
    const updated = { ...current, ...eventData, id: eventId };
    mockEvents = mockEvents.map((e) => (e.id === eventId ? updated : e));
    return updated;
  }
  return apiFetch(`/api/events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify({ ...eventData, userId })
  });
};

export const joinEvent = async (eventId, userId, userProfile) => {
  if (USE_MOCK) {
    const event = mockEvents.find((e) => e.id === eventId);
    if (!event) throw new Error('Событие не найдено');
    if (isEventOwner(event, userId)) throw new Error('Организатор не может записаться на своё событие');
    if (event.maxParticipants && event.participants >= event.maxParticipants) throw new Error('Мест больше нет');
    if (!mockJoins.has(eventId)) mockJoins.set(eventId, new Set());
    if (mockJoins.get(eventId).has(String(userId))) throw new Error('Вы уже участвуете');
    await new Promise((r) => setTimeout(r, 100));
    mockJoins.get(eventId).add(String(userId));
    if (userProfile) {
      mockUsers[String(userId)] = { ...(mockUsers[String(userId)] || {}), ...userProfile, id: String(userId) };
    }
    const newParticipants = Math.max(event.participants || 1, 1 + mockJoins.get(eventId).size);
    return { success: true, participants: newParticipants };
  }
  return apiFetch(`/api/events/${eventId}/join`, {
    method: 'POST',
    body: JSON.stringify({ userId, userProfile })
  });
};

export const leaveEvent = async (eventId, userId) => {
  if (USE_MOCK) {
    const event = mockEvents.find((e) => e.id === eventId);
    if (!event) throw new Error('Событие не найдено');
    if (isEventOwner(event, userId)) throw new Error('Организатор не может отказаться от своего события');
    if (!mockJoins.get(eventId)?.has(String(userId))) throw new Error('Вы не участвуете');
    await new Promise((r) => setTimeout(r, 100));
    mockJoins.get(eventId).delete(String(userId));
    const newParticipants = Math.max(1, 1 + (mockJoins.get(eventId)?.size || 0));
    return { success: true, participants: newParticipants };
  }
  return apiFetch(`/api/events/${eventId}/leave`, {
    method: 'POST',
    body: JSON.stringify({ userId })
  });
};

export const deleteEvent = async (eventId, userId) => {
  if (USE_MOCK) {
    const event = mockEvents.find((e) => e.id === eventId);
    if (!event) throw new Error('Событие уже удалено');
    if (!isEventOwner(event, userId)) throw new Error('Удалить событие может только организатор');
    mockEvents = mockEvents.filter((e) => e.id !== eventId);
    mockJoins.delete(eventId);
    mockReviews = mockReviews.filter((r) => r.eventId !== eventId);
    return { success: true };
  }
  return apiFetch(`/api/events/${eventId}?userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE'
  });
};

export const reportEvent = async (eventId, reason, reporterId) => {
  if (USE_MOCK) {
    console.log('[Report]', { eventId, reason, reporterId });
    return { success: true };
  }
  return apiFetch('/api/reports', {
    method: 'POST',
    body: JSON.stringify({ eventId, reason, reporterId })
  });
};

export const uploadImages = async (files) => {
  if (USE_MOCK) {
    return Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.readAsDataURL(file);
          })
      )
    );
  }
  const fd = new FormData();
  files.forEach((f) => fd.append('photos', f));
  const res = await fetch(`${API}/api/upload`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Не удалось загрузить фото');
  const data = await res.json();
  return (data.urls || []).map((u) => `${API}${u}`);
};

export const checkHealth = async () => {
  try { return await apiFetch('/health'); }
  catch (e) { return { status: 'error', message: e.message }; }
};

export const reverseGeocode = async (lat, lng) => {
  return apiFetch(`/api/cities/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
};

// ============ REVIEWS ============

export const fetchReviews = async (eventId) => {
  if (USE_MOCK) {
    return mockReviews.filter((r) => r.eventId === eventId);
  }
  return apiFetch(`/api/events/${eventId}/reviews`);
};

export const addReview = async (review) => {
  if (USE_MOCK) {
    const existing = mockReviews.find(
      (r) => r.eventId === review.eventId && String(r.userId) === String(review.userId)
    );
    if (existing) throw new Error('Вы уже оставили отзыв');
    const newReview = { ...review, id: Date.now(), createdAt: new Date().toISOString() };
    mockReviews = [newReview, ...mockReviews];
    return newReview;
  }
  return apiFetch(`/api/events/${review.eventId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(review)
  });
};