import React, { useMemo, useState } from 'react';
import EventCard from './EventCard';
import Icon from './Icon';
import { isEventOwner } from '../utils/eventOwnership';
import { getEventStatus } from '../utils/eventFilters';

const MyEvents = ({
  events,
  onJoin,
  onLeave,
  onDelete,
  onEdit,
  onEventClick,
  joinedIds = [],
  participatedIds = [],
  likedIds = [],
  onToggleLike,
  userId,
  showCreatedInitially,
}) => {
  const [tab, setTab] = useState(showCreatedInitially ? 'created' : 'joined');
  const [confirmLeave, setConfirmLeave] = useState(null);

  const { joinedEvents, createdEvents } = useMemo(() => {
    const isMe = (e) => isEventOwner(e, userId);

    const sortByStatus = (a, b) => {
      const order = { live: 0, soon: 1, upcoming: 2, unknown: 3, past: 4 };
      const sa = order[getEventStatus(a)] ?? 5;
      const sb = order[getEventStatus(b)] ?? 5;
      if (sa !== sb) return sa - sb;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    };

    // ★ «Участвую» — только текущие участия (joinedIds).
    //   participatedIds нужен только для отзывов, но не для отображения здесь.
    const joined = events
      .filter((e) => joinedIds.includes(e.id) && !isMe(e))
      .sort(sortByStatus);

    const created = events
      .filter((e) => isMe(e))
      .sort(sortByStatus);

    return { joinedEvents: joined, createdEvents: created };
  }, [events, joinedIds, userId]);

  const displayEvents = tab === 'joined' ? joinedEvents : createdEvents;

  const handleLeaveWithConfirm = (event) => setConfirmLeave(event);

  return (
    <div className="my-events-page">
      <h2 className="page-title">Мои события</h2>

      <div className="my-events-tabs">
        <button
          className={`my-tab ${tab === 'joined' ? 'active' : ''}`}
          onClick={() => setTab('joined')}
        >
          Участвую ({joinedEvents.length})
        </button>
        <button
          className={`my-tab ${tab === 'created' ? 'active' : ''}`}
          onClick={() => setTab('created')}
        >
          Организую ({createdEvents.length})
        </button>
      </div>

      {displayEvents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Icon name={tab === 'joined' ? 'calendar' : 'plus'} size={44} />
          </div>
          <h3>
            {tab === 'joined'
              ? 'Вы пока не участвуете ни в одном событии'
              : 'Вы пока не создали ни одного события'}
          </h3>
          <p>
            {tab === 'joined'
              ? 'Найдите интересное событие в ленте и присоединитесь'
              : 'Нажмите «+» внизу, чтобы создать своё первое событие'}
          </p>
        </div>
      ) : (
        <div className="event-feed">
          {displayEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onJoin={onJoin}
              onLeave={() => handleLeaveWithConfirm(event)}
              onClick={onEventClick}
              isJoined={joinedIds.includes(event.id)}
              isLiked={likedIds.includes(event.id)}
              onToggleLike={onToggleLike}
              isOwner={isEventOwner(event, userId)}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}

      {confirmLeave && (
        <div className="modal-overlay" onClick={() => setConfirmLeave(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Отменить участие?</h2>
              <button className="close-btn" onClick={() => setConfirmLeave(null)}>
                <Icon name="close" size={22} />
              </button>
            </div>
            <p style={{ marginBottom: 16, color: '#555' }}>
              Вы отмените участие в «{confirmLeave.title}».
            </p>
            <div className="modal-actions">
              <button className="reset-btn" onClick={() => setConfirmLeave(null)}>
                Оставить
              </button>
              <button
                className="apply-btn"
                onClick={() => {
                  const ev = confirmLeave;
                  setConfirmLeave(null);
                  onLeave(ev);
                }}
              >
                Отменить участие
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyEvents;