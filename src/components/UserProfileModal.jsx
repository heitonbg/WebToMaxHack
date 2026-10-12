import React, { useEffect, useMemo, useState } from 'react';
import { resolveEventImage } from '../utils/defaultEventImages';
import Icon from './Icon';
import {
  fetchFriendStatus,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  openMaxChat,
} from '../api/events';

const statusLabel = (event) => {
  const raw = String(event?.date || '');
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T,\s]+(\d{1,2}):(\d{2}))?/);
  if (!match) return '';

  const start = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] || 0),
    Number(match[5] || 0)
  );
  if (Number.isNaN(start.getTime())) return '';

  const durationMs = 2 * 60 * 60 * 1000;
  const end = start.getTime() + durationMs;

  const now = Date.now();
  if (now >= end) return 'Завершено';
  if (now >= start.getTime()) return 'Идёт сейчас';
  if (now >= start.getTime() - 60 * 60 * 1000) return 'Скоро';
  return '';
};

export default function UserProfileModal({
  person,
  events = [],
  reviews = [],
  currentUserId,
  onClose,
  onEventClick,
  onFriendsChanged,
}) {
  const [friendStatus, setFriendStatus] = useState('none');
  const [statusLoading, setStatusLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const isSelf = String(person?.id || '') === String(currentUserId || '');

  useEffect(() => {
    if (!currentUserId || !person?.id || isSelf) {
      setFriendStatus('none');
      return;
    }
    let cancelled = false;
    setStatusLoading(true);
    fetchFriendStatus(currentUserId, person.id)
      .then((res) => {
        if (!cancelled) setFriendStatus(res?.status || 'none');
      })
      .catch(() => {
        if (!cancelled) setFriendStatus('none');
      })
      .finally(() => {
        if (!cancelled) setStatusLoading(false);
      });
    return () => { cancelled = true; };
  }, [currentUserId, person?.id, isSelf]);

  const personEvents = useMemo(() => {
    const id = String(person?.id || '');
    if (!id) return [];

    return events.filter((event) => {
      const orgId = event.organizerId ?? event.organizer?.id;
      if (String(orgId) === id) return true;
      if (Array.isArray(event.participantIds)) {
        return event.participantIds.map(String).includes(id);
      }
      return false;
    });
  }, [events, person?.id]);

  const averageOrganizerRating =
    Number.isFinite(Number(person?.organizerRating)) &&
    person?.organizerRating != null
      ? Number(person.organizerRating).toFixed(1)
      : '—';
  const organizerRatingCount = Number(person?.organizerRatingCount) || 0;
  const reviewsByPerson = reviews.filter(
    (review) => String(review.userId) === String(person.id)
  );
  const reviewsWrittenCount =
    person?.reviewsWrittenCount ?? reviewsByPerson.length;

  const subtitle =
    [person.age && `${person.age} лет`, person.city].filter(Boolean).join(' · ') ||
    'Профиль участника';

  const notify = () => onFriendsChanged?.({});

  const handleAddFriend = async () => {
    if (busy || !currentUserId || !person?.id) return;
    setBusy(true);
    try {
      if (friendStatus === 'incoming') {
        await acceptFriendRequest(currentUserId, person.id);
        setFriendStatus('friends');
      } else {
        const res = await sendFriendRequest(currentUserId, person.id);
        setFriendStatus(res?.status || 'outgoing');
      }
      notify();
    } catch (error) {
      console.warn('Не удалось обновить статус дружбы', error);
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    if (busy || !currentUserId || !person?.id) return;
    setBusy(true);
    try {
      await declineFriendRequest(currentUserId, person.id);
      setFriendStatus('none');
      notify();
    } catch (error) {
      console.warn('Не удалось отклонить заявку', error);
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (busy || !currentUserId || !person?.id) return;
    setBusy(true);
    try {
      await removeFriend(currentUserId, person.id);
      setFriendStatus('none');
      notify();
    } catch (error) {
      console.warn('Не удалось удалить друга', error);
    } finally {
      setBusy(false);
    }
  };

  const handleOpenChat = () => {
    if (person?.maxLink) openMaxChat(person.maxLink);
  };

  const renderFriendButtons = () => {
    if (isSelf || !currentUserId) return null;
    if (statusLoading) {
      return <button type="button" className="friend-action-btn" disabled>Загрузка…</button>;
    }
    if (friendStatus === 'friends') {
      return (
        <>
          <button
            type="button"
            className="friend-action-btn friend-action-btn--chat"
            onClick={handleOpenChat}
            disabled={!person.maxLink}
            title={person.maxLink ? 'Написать в MAX' : 'Пользователь пока не добавил ссылку на MAX'}
          >
            <Icon name="share" size={17} /> Написать в MAX
          </button>
          <button
            type="button"
            className="friend-action-btn friend-action-btn--danger"
            onClick={handleRemoveFriend}
            disabled={busy}
          >
            Удалить из друзей
          </button>
        </>
      );
    }
    if (friendStatus === 'outgoing') {
      return (
        <button type="button" className="friend-action-btn" disabled>
          Заявка отправлена
        </button>
      );
    }
    if (friendStatus === 'incoming') {
      return (
        <>
          <button
            type="button"
            className="friend-action-btn friend-action-btn--primary"
            onClick={handleAddFriend}
            disabled={busy}
          >
            Принять заявку
          </button>
          <button
            type="button"
            className="friend-action-btn friend-action-btn--danger"
            onClick={handleDecline}
            disabled={busy}
          >
            Отклонить
          </button>
        </>
      );
    }
    return (
      <button
        type="button"
        className="friend-action-btn friend-action-btn--primary"
        onClick={handleAddFriend}
        disabled={busy}
      >
        <Icon name="people" size={17} /> Добавить в друзья
      </button>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section
        className="modal-content person-profile-modal"
        onClick={(e) => e.stopPropagation()}
        aria-labelledby="person-profile-title"
      >
        <button
          className="close-btn person-profile-close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          <Icon name="close" size={22} />
        </button>

        <div className="person-profile-hero">
          <span className="person-profile-avatar">
            {person.photo_url ? (
              <img src={person.photo_url} alt={person.name || 'Участник'} />
            ) : (
              person.name?.slice(0, 1).toUpperCase() || 'У'
            )}
          </span>
          <h2 id="person-profile-title">{person.name || 'Участник'}</h2>
          <p>{subtitle}</p>
          {Number(person.organizedEventsCount) > 0 && (
            <span className="person-profile-role">Организатор мероприятий</span>
          )}
          {!isSelf && <div className="person-profile-actions">{renderFriendButtons()}</div>}
        </div>

        {person.about && (
          <section className="person-profile-section">
            <h3>О себе</h3>
            <p>{person.about}</p>
          </section>
        )}

        <div className="person-profile-stats">
          <div className="person-profile-stat">
            <strong>{personEvents.length}</strong>
            <small>События</small>
          </div>
          <div className="person-profile-stat person-profile-stat--rating">
            <strong>
              <Icon name="star" size={15} filled /> {averageOrganizerRating}
            </strong>
            <small title="Рейтинг организатора">
              Рейтинг{organizerRatingCount ? ` · ${organizerRatingCount}` : ''}
            </small>
          </div>
          <div className="person-profile-stat">
            <strong>{reviewsWrittenCount}</strong>
            <small>Отзывов</small>
          </div>
        </div>

        <section className="person-profile-section">
          <h3>События</h3>
          {personEvents.length ? (
            <div className="person-events">
              {personEvents.slice(0, 20).map((event) => (
                <button key={event.id} onClick={() => onEventClick(event)}>
                  <img src={resolveEventImage(event)} alt="" />
                  <span>
                    <strong>{event.title}</strong>
                    <small>
                      {event.date}
                      {statusLabel(event) ? ` · ${statusLabel(event)}` : ''}
                    </small>
                  </span>
                  <Icon name="chevronRight" size={18} />
                </button>
              ))}
            </div>
          ) : (
            <p>История событий пока не опубликована.</p>
          )}
        </section>
      </section>
    </div>
  );
}