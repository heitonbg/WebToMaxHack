// src/api/friends.js
import { openMaxChat } from '../utils/maxBridge.js';

const configuredApiUrl = String(import.meta.env?.VITE_API_URL || '').trim().replace(/\/+$/, '');
const API = configuredApiUrl || 'https://maxserver-iwrawww.amvera.io';

const USE_MOCK =
  import.meta.env?.VITE_USE_MOCK === 'true' ||
  (import.meta.env.DEV && import.meta.env?.VITE_USE_MOCK !== 'false');

// ============================================
// MOCK STATE
// ============================================
const mockFriends = new Map();     // userId -> Set<friendId>
const mockIncoming = new Map();    // userId -> [{ user, createdAt }]
const mockOutgoing = new Map();    // userId -> [{ user, createdAt }]
const mockProfiles = new Map();    // id -> { id, name, photo_url, city, age }

const readSet = (map, key) => {
  if (!map.has(key)) map.set(key, new Set());
  return map.get(key);
};
const readList = (map, key) => {
  if (!map.has(key)) map.set(key, []);
  return map.get(key);
};
const memoProfile = (id, patch = {}) => {
  const key = String(id);
  const existing = mockProfiles.get(key) || { id: key, name: `Пользователь ${key}` };
  const merged = { ...existing, ...patch };
  mockProfiles.set(key, merged);
  return merged;
};

// ============================================
// API FETCH
// ============================================
async function apiFetch(path, options = {}) {
  const { timeoutMs = 12000, headers = {}, ...rest } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API}${path}`, {
      ...rest,
      headers: { 'Content-Type': 'application/json', ...headers },
      signal: controller.signal,
    });
    if (!res.ok) {
      let message = `Ошибка ${res.status}`;
      try {
        const payload = await res.json();
        message = payload.error || message;
      } catch {}
      throw new Error(message);
    }
    return res.status === 204 ? { success: true } : res.json();
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Сервер не ответил. Попробуйте ещё раз.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================
// СПИСОК ДРУЗЕЙ
// ============================================
export async function fetchFriends(userId) {
  if (!userId) return { friends: [], incoming: [], outgoing: [] };
  if (USE_MOCK) {
    const friends = [...readSet(mockFriends, String(userId))].map((id) =>
      memoProfile(id, { name: `Друг ${id}` })
    );
    return {
      friends,
      incoming: readList(mockIncoming, String(userId)),
      outgoing: readList(mockOutgoing, String(userId)),
    };
  }
  return apiFetch(`/api/friends?userId=${encodeURIComponent(userId)}`);
}

// ============================================
// ТОЛЬКО ЗАЯВКИ (входящие + исходящие)
// ============================================
export async function fetchFriendRequests(userId) {
  if (!userId) return { incoming: [], outgoing: [] };
  if (USE_MOCK) {
    return {
      incoming: readList(mockIncoming, String(userId)),
      outgoing: readList(mockOutgoing, String(userId)),
    };
  }
  const data = await apiFetch(`/api/friends?userId=${encodeURIComponent(userId)}`);
  return {
    incoming: data.incoming || [],
    outgoing: data.outgoing || [],
  };
}

// ============================================
// СТАТУС МЕЖДУ ДВУМЯ
// ============================================
export async function fetchFriendStatus(userId, otherId) {
  if (!userId || !otherId) return { status: 'none' };
  if (USE_MOCK) {
    if (String(userId) === String(otherId)) return { status: 'self' };
    if (readSet(mockFriends, String(userId)).has(String(otherId))) return { status: 'friends' };
    if (readList(mockOutgoing, String(userId)).some((x) => String(x.user?.id) === String(otherId))) {
      return { status: 'outgoing' };
    }
    if (readList(mockIncoming, String(userId)).some((x) => String(x.user?.id) === String(otherId))) {
      return { status: 'incoming' };
    }
    return { status: 'none' };
  }
  return apiFetch(
    `/api/friends/status?userId=${encodeURIComponent(userId)}&otherId=${encodeURIComponent(otherId)}`
  );
}

// ============================================
// ПОИСК ПОЛЬЗОВАТЕЛЕЙ
// ============================================
/**
 * Возвращает { results: [{ id, name, photo_url, city, age,
 *   friendshipStatus: 'accepted'|'pending'|null, requestedByMe: boolean }] }
 *
 * В mock-режиме ищем среди уже известных друзей / заявок / профилей.
 * В реальном режиме — /api/users/search; если эндпоинта нет, мягко
 * возвращаем пустой результат, чтобы страница не падала.
 */
export async function searchFriends(userId, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!userId || q.length < 2) return { results: [] };

  if (USE_MOCK) {
    const friendSet = readSet(mockFriends, String(userId));
    const incoming = readList(mockIncoming, String(userId));
    const outgoing = readList(mockOutgoing, String(userId));

    const incomingIds = new Set(incoming.map((x) => String(x.user?.id)));
    const outgoingIds = new Set(outgoing.map((x) => String(x.user?.id)));

    const pool = new Map();
    for (const id of friendSet) {
      pool.set(String(id), memoProfile(id));
    }
    for (const entry of incoming) {
      if (entry?.user?.id != null) pool.set(String(entry.user.id), memoProfile(entry.user.id, entry.user));
    }
    for (const entry of outgoing) {
      if (entry?.user?.id != null) pool.set(String(entry.user.id), memoProfile(entry.user.id, entry.user));
    }

    const results = [...pool.values()]
      .filter((person) =>
        String(person.name || '').toLowerCase().includes(q) ||
        String(person.id || '').includes(q)
      )
      .slice(0, 30)
      .map((person) => {
        const id = String(person.id);
        let friendshipStatus = null;
        let requestedByMe = false;
        if (friendSet.has(id)) {
          friendshipStatus = 'accepted';
        } else if (outgoingIds.has(id)) {
          friendshipStatus = 'pending';
          requestedByMe = true;
        } else if (incomingIds.has(id)) {
          friendshipStatus = 'pending';
          requestedByMe = false;
        }
        return {
          ...person,
          id,
          friendshipStatus,
          requestedByMe,
        };
      });

    return { results };
  }

  try {
    const data = await apiFetch(
      `/api/users/search?q=${encodeURIComponent(query)}&userId=${encodeURIComponent(userId)}`
    );
    const users = Array.isArray(data.users) ? data.users : Array.isArray(data.results) ? data.results : [];
    return { results: users };
  } catch (error) {
    // Эндпоинта поиска нет — не падаем, просто пустой результат.
    console.warn('searchFriends: серверный поиск недоступен', error.message);
    return { results: [] };
  }
}

// ============================================
// ЗАЯВКА В ДРУЗЬЯ
// ============================================
export async function requestFriend(fromId, toId) {
  if (!fromId || !toId) throw new Error('Нужны оба идентификатора');
  if (USE_MOCK) {
    const outList = readList(mockOutgoing, String(fromId));
    if (!outList.some((x) => String(x.user?.id) === String(toId))) {
      outList.push({
        user: memoProfile(toId),
        createdAt: Date.now(),
      });
    }
    const inList = readList(mockIncoming, String(toId));
    if (!inList.some((x) => String(x.user?.id) === String(fromId))) {
      inList.push({
        user: memoProfile(fromId),
        createdAt: Date.now(),
      });
    }
    return { status: 'outgoing' };
  }
  return apiFetch('/api/friends/request', {
    method: 'POST',
    body: JSON.stringify({ fromId, toId }),
  });
}

// алиас для совместимости с App.jsx
export const sendFriendRequest = requestFriend;

// ============================================
// ПРИНЯТЬ ЗАЯВКУ
// ============================================
export async function acceptFriend(userId, fromId) {
  if (!userId || !fromId) throw new Error('Нужны оба идентификатора');
  if (USE_MOCK) {
    const incoming = readList(mockIncoming, String(userId));
    const idx = incoming.findIndex((x) => String(x.user?.id) === String(fromId));
    if (idx >= 0) incoming.splice(idx, 1);
    readSet(mockFriends, String(userId)).add(String(fromId));
    readSet(mockFriends, String(fromId)).add(String(userId));
    return { status: 'friends' };
  }
  return apiFetch('/api/friends/accept', {
    method: 'POST',
    body: JSON.stringify({ userId, fromId }),
  });
}

// алиас для совместимости
export const acceptFriendRequest = acceptFriend;

// ============================================
// ОТКЛОНИТЬ ЗАЯВКУ / УБРАТЬ ИСХОДЯЩУЮ
// ============================================
export async function declineFriend(userId, fromId) {
  if (!userId || !fromId) throw new Error('Нужны оба идентификатора');
  if (USE_MOCK) {
    // Входящая
    const incoming = readList(mockIncoming, String(userId));
    const inIdx = incoming.findIndex((x) => String(x.user?.id) === String(fromId));
    if (inIdx >= 0) incoming.splice(inIdx, 1);
    // Исходящая (если страница вызывает для "Отменить")
    const outgoing = readList(mockOutgoing, String(userId));
    const outIdx = outgoing.findIndex((x) => String(x.user?.id) === String(fromId));
    if (outIdx >= 0) outgoing.splice(outIdx, 1);
    return { status: 'none' };
  }
  return apiFetch('/api/friends/decline', {
    method: 'POST',
    body: JSON.stringify({ userId, fromId }),
  });
}

// алиас для совместимости
export const declineFriendRequest = declineFriend;

// ============================================
// УДАЛИТЬ ИЗ ДРУЗЕЙ (взаимно)
// ============================================
export async function removeFriend(userId, friendId) {
  if (!userId || !friendId) throw new Error('Нужны оба идентификатора');
  if (USE_MOCK) {
    readSet(mockFriends, String(userId)).delete(String(friendId));
    readSet(mockFriends, String(friendId)).delete(String(userId));
    return { status: 'none' };
  }
  return apiFetch(
    `/api/friends/${encodeURIComponent(friendId)}?userId=${encodeURIComponent(userId)}`,
    { method: 'DELETE' }
  );
}

// ============================================
// ОТКРЫТЬ ЧАТ В MAX
// ============================================
export { openMaxChat };