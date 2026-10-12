// src/components/FriendsPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import ConfirmDialog from './ConfirmDialog';
import {
  fetchFriends,
  fetchFriendRequests,
  searchFriends,
  requestFriend,
  acceptFriend,
  declineFriend,
  removeFriend,
  openMaxChat,
} from '../api/friends';

const TABS = [
  { id: 'friends', label: 'Друзья' },
  { id: 'incoming', label: 'Заявки' },
  { id: 'outgoing', label: 'Отправленные' },
];

const normalizePerson = (entry) => {
  if (!entry) return null;
  const raw = entry.user ? entry.user : entry;
  if (!raw || raw.id == null) return null;
  return {
    id: String(raw.id),
    name: raw.name || 'Пользователь',
    photo_url: raw.photo_url || null,
    city: raw.city || null,
    age: raw.age ?? null,
    about: raw.about || null,
    maxLink: raw.maxLink || '',
    friendshipStatus: raw.friendshipStatus ?? null,
    requestedByMe: Boolean(raw.requestedByMe),
  };
};

const normalizeList = (list) =>
  (Array.isArray(list) ? list : []).map(normalizePerson).filter(Boolean);

const subtitleFor = (person) =>
  [person.age && `${person.age} лет`, person.city].filter(Boolean).join(' · ') ||
  'Пользователь Вместе';

const PersonRow = ({ person, actions, onOpen }) => (
  <div className="friend-row">
    <button
      type="button"
      className="friend-row-main"
      onClick={() => onOpen?.(person)}
    >
      <span className="friend-avatar">
        {person.photo_url ? (
          <img src={person.photo_url} alt={person.name || 'Пользователь'} />
        ) : (
          (person.name || 'П').slice(0, 1).toUpperCase()
        )}
      </span>
      <span className="friend-meta">
        <strong>{person.name || 'Пользователь'}</strong>
        <small>{subtitleFor(person)}</small>
      </span>
    </button>
    {actions && <div className="friend-actions">{actions}</div>}
  </div>
);

export default function FriendsPage({
  userId,
  onOpenProfile,
  onFriendsChanged,
}) {
  const [tab, setTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null);
  const [busy, setBusy] = useState({});

  const onFriendsChangedRef = useRef(onFriendsChanged);
  useEffect(() => {
    onFriendsChangedRef.current = onFriendsChanged;
  }, [onFriendsChanged]);

  const lastSignatureRef = useRef('');

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        fetchFriends(userId),
        fetchFriendRequests(userId),
      ]);

      const list = normalizeList(friendsRes?.friends);
      const incoming = normalizeList(requestsRes?.incoming);
      const outgoing = normalizeList(requestsRes?.outgoing);

      setFriends(list);
      setRequests({ incoming, outgoing });

      const signature = [
        list.map((p) => p.id).sort().join(','),
        incoming.map((p) => p.id).sort().join(','),
        outgoing.map((p) => p.id).sort().join(','),
      ].join('|');

      if (signature !== lastSignatureRef.current) {
        lastSignatureRef.current = signature;
        onFriendsChangedRef.current?.({
          friendsCount: list.length,
          incomingCount: incoming.length,
        });
      }
    } catch (e) {
      setError(e?.message || 'Не удалось загрузить друзей');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!userId) return undefined;
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return undefined;
    }
    setSearching(true);
    const t = setTimeout(() => {
      searchFriends(userId, q)
        .then((res) => {
          const results = Array.isArray(res)
            ? res
            : Array.isArray(res?.results)
              ? res.results
              : Array.isArray(res?.users)
                ? res.users
                : [];
          setSearchResults(normalizeList(results));
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query, userId]);

  const clearBusy = (id) => {
    setBusy((b) => {
      const next = { ...b };
      delete next[id];
      return next;
    });
  };

  // ★ Отправить заявку. Оптимистично меняем UI.
  const handleRequest = async (person) => {
    if (!userId || busy[person.id]) return;
    setBusy((b) => ({ ...b, [person.id]: true }));
    setError('');
    try {
      const res = await requestFriend(userId, person.id);
      const status = res?.status || 'outgoing';

      // Убираем из результатов поиска.
      setSearchResults((prev) =>
        prev.map((p) =>
          p.id === person.id
            ? {
                ...p,
                friendshipStatus: status === 'friends' ? 'accepted' : 'pending',
                requestedByMe: status !== 'friends',
              }
            : p
        )
      );

      if (status === 'friends') {
        // Встречная заявка — сразу друзья.
        setFriends((prev) =>
          prev.some((p) => p.id === person.id) ? prev : [person, ...prev]
        );
        setRequests((prev) => ({
          ...prev,
          incoming: prev.incoming.filter((p) => p.id !== person.id),
        }));
      } else {
        // Добавляем в исходящие.
        setRequests((prev) => {
          if (prev.outgoing.some((p) => p.id === person.id)) return prev;
          return {
            ...prev,
            outgoing: [person, ...prev.outgoing],
          };
        });
      }

      onFriendsChangedRef.current?.();
      load();
    } catch (e) {
      setError(e?.message || 'Не удалось отправить заявку');
    } finally {
      clearBusy(person.id);
    }
  };

  // ★ Принять входящую.
  const handleAccept = async (person) => {
    if (!userId || busy[person.id]) return;
    setBusy((b) => ({ ...b, [person.id]: true }));
    setError('');
    try {
      await acceptFriend(userId, person.id);
      setRequests((prev) => ({
        ...prev,
        incoming: prev.incoming.filter((p) => p.id !== person.id),
      }));
      setFriends((prev) =>
        prev.some((p) => p.id === person.id) ? prev : [person, ...prev]
      );
      onFriendsChangedRef.current?.();
      load();
    } catch (e) {
      setError(e?.message || 'Не удалось принять заявку');
    } finally {
      clearBusy(person.id);
    }
  };

  // ★ Отклонить входящую / отменить исходящую.
  const handleDecline = async (person) => {
    if (!userId || busy[person.id]) return;
    setBusy((b) => ({ ...b, [person.id]: true }));
    setError('');
    try {
      await declineFriend(userId, person.id);
      setRequests((prev) => ({
        incoming: prev.incoming.filter((p) => p.id !== person.id),
        outgoing: prev.outgoing.filter((p) => p.id !== person.id),
      }));
      setSearchResults((prev) =>
        prev.map((p) =>
          p.id === person.id
            ? { ...p, friendshipStatus: null, requestedByMe: false }
            : p
        )
      );
      onFriendsChangedRef.current?.();
    } catch (e) {
      setError(e?.message || 'Не удалось отменить заявку');
    } finally {
      clearBusy(person.id);
    }
  };

  const handleRemove = async () => {
    if (!pendingRemove) return;
    const person = pendingRemove;
    setBusy((b) => ({ ...b, [person.id]: true }));
    setError('');
    try {
      await removeFriend(userId, person.id);
      setPendingRemove(null);
      setFriends((prev) => prev.filter((p) => p.id !== person.id));
      onFriendsChangedRef.current?.();
      load();
    } catch (e) {
      setError(e?.message || 'Не удалось удалить из друзей');
    } finally {
      clearBusy(person.id);
    }
  };

  const counts = useMemo(
    () => ({
      friends: friends.length,
      incoming: requests.incoming.length,
      outgoing: requests.outgoing.length,
    }),
    [friends.length, requests.incoming.length, requests.outgoing.length]
  );

  if (!userId) {
    return (
      <div className="friends-page">
        <h2 className="page-title">Друзья</h2>
        <div className="empty-state">
          <div className="empty-icon">
            <Icon name="user" size={44} />
          </div>
          <h3>Подождите, загружаем профиль…</h3>
          <p>Как только MAX Bridge отдаст ваши данные, здесь появятся друзья.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="friends-page">
      <h2 className="page-title">Друзья</h2>

      <div className="my-events-tabs my-events-tabs--three">
        {TABS.map((t) => {
          const count =
            t.id === 'friends'
              ? counts.friends
              : t.id === 'incoming'
                ? counts.incoming
                : counts.outgoing;
          return (
            <button
              key={t.id}
              className={`my-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="friends-search">
        <span className="friends-search-icon" aria-hidden="true">
          <Icon name="search" size={19} />
        </span>
        <input
          type="text"
          className="friends-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Найти человека по имени"
          autoComplete="off"
          spellCheck="false"
        />
        {query && (
          <button
            type="button"
            className="friends-search-clear"
            onClick={() => setQuery('')}
            aria-label="Очистить поиск"
          >
            <Icon name="close" size={14} />
          </button>
        )}
      </div>

      {error && (
        <p className="friends-error" role="alert">
          {error}
        </p>
      )}

      {query.trim().length >= 2 && (
        <section className="friends-section">
          <h3 className="friends-section-title">
            {searching ? 'Ищем…' : `Найдено: ${searchResults.length}`}
          </h3>

          {!searching && searchResults.length === 0 && (
            <p className="friends-empty">
              Среди тех, с кем вы были на событиях, никого не нашлось.
            </p>
          )}

          <div className="friends-list">
            {searchResults.map((person) => {
              const isFriend = person.friendshipStatus === 'accepted';
              const isPendingMe =
                person.friendshipStatus === 'pending' && person.requestedByMe;
              const isPendingThem =
                person.friendshipStatus === 'pending' && !person.requestedByMe;

              let actions = null;
              if (isFriend) {
                actions = <span className="friends-badge">Уже друзья</span>;
              } else if (isPendingMe) {
                actions = (
                  <>
                    <span className="friends-badge muted">Заявка отправлена</span>
                    <button
                      type="button"
                      className="friend-btn danger"
                      disabled={busy[person.id]}
                      onClick={() => handleDecline(person)}
                    >
                      Отменить
                    </button>
                  </>
                );
              } else if (isPendingThem) {
                actions = (
                  <>
                    <button
                      type="button"
                      className="friend-btn primary"
                      disabled={busy[person.id]}
                      onClick={() => handleAccept(person)}
                    >
                      Принять
                    </button>
                    <button
                      type="button"
                      className="friend-btn danger"
                      disabled={busy[person.id]}
                      onClick={() => handleDecline(person)}
                    >
                      Отклонить
                    </button>
                  </>
                );
              } else {
                actions = (
                  <button
                    type="button"
                    className="friend-btn primary"
                    disabled={busy[person.id]}
                    onClick={() => handleRequest(person)}
                  >
                    <Icon name="plus" size={15} /> Добавить
                  </button>
                );
              }

              return (
                <PersonRow
                  key={person.id}
                  person={person}
                  actions={actions}
                  onOpen={onOpenProfile}
                />
              );
            })}
          </div>
        </section>
      )}

      {tab === 'friends' && query.trim().length < 2 && (
        <section className="friends-section">
          {loading ? (
            <p className="friends-empty">Загружаем…</p>
          ) : friends.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Icon name="people" size={44} />
              </div>
              <h3>Пока нет друзей</h3>
              <p>
                Запишитесь на событие — после него сможете добавить в друзья
                тех, с кем познакомились.
              </p>
            </div>
          ) : (
            <div className="friends-list">
              {friends.map((f) => (
                <PersonRow
                  key={f.id}
                  person={f}
                  onOpen={onOpenProfile}
                  actions={
                    <>
                      <button
                        type="button"
                        className="friend-btn"
                        onClick={() => openMaxChat(f.maxLink)}
                        disabled={!f.maxLink}
                        title={f.maxLink ? 'Написать в MAX' : 'Пользователь пока не добавил ссылку на MAX'}
                      >
                        <Icon name="share" size={15} /> Написать
                      </button>
                      <button
                        type="button"
                        className="friend-btn danger"
                        disabled={busy[f.id]}
                        onClick={() => setPendingRemove(f)}
                        title="Удалить из друзей"
                      >
                        Удалить
                      </button>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'incoming' && query.trim().length < 2 && (
        <section className="friends-section">
          {requests.incoming.length === 0 ? (
            <p className="friends-empty">Входящих заявок нет.</p>
          ) : (
            <div className="friends-list">
              {requests.incoming.map((p) => (
                <PersonRow
                  key={p.id}
                  person={p}
                  onOpen={onOpenProfile}
                  actions={
                    <>
                      <button
                        type="button"
                        className="friend-btn primary"
                        disabled={busy[p.id]}
                        onClick={() => handleAccept(p)}
                      >
                        Принять
                      </button>
                      <button
                        type="button"
                        className="friend-btn danger"
                        disabled={busy[p.id]}
                        onClick={() => handleDecline(p)}
                      >
                        Отклонить
                      </button>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'outgoing' && query.trim().length < 2 && (
        <section className="friends-section">
          {requests.outgoing.length === 0 ? (
            <p className="friends-empty">Исходящих заявок нет.</p>
          ) : (
            <div className="friends-list">
              {requests.outgoing.map((p) => (
                <PersonRow
                  key={p.id}
                  person={p}
                  onOpen={onOpenProfile}
                  actions={
                    <>
                      <span className="friends-badge muted">Заявка отправлена</span>
                      <button
                        type="button"
                        className="friend-btn danger"
                        disabled={busy[p.id]}
                        onClick={() => handleDecline(p)}
                      >
                        Отменить
                      </button>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}

      {pendingRemove && (
        <ConfirmDialog
          title="Удалить из друзей?"
          description={`${
            pendingRemove.name || 'Пользователь'
          } исчезнет из списка друзей. Заявку можно будет отправить снова после общего события.`}
          confirmLabel="Удалить"
          cancelLabel="Оставить"
          destructive
          busy={Boolean(busy[pendingRemove.id])}
          onCancel={() => setPendingRemove(null)}
          onConfirm={handleRemove}
        />
      )}
    </div>
  );
}