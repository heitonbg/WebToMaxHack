import React, { useMemo } from 'react';
import Icon from './Icon';

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

  // Длительность по умолчанию — 2 часа
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
  onClose,
  onEventClick,
}) {
  // ★ События, в которых человек участвовал: он либо организатор,
  //   либо в списке участников (по данным event.participants, но у нас есть
  //   только те события, которые передал App). Фильтруем по organizerId
  //   и по тому, что человек мог участвовать — если event.participantIds
  //   есть в объекте события, используем его.
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

  // ★ Средняя оценка организатора — по organizerRating в отзывах
  const organizerRatings = useMemo(
    () =>
      reviews
        .filter((r) => String(r.organizerId || r.eventOrganizerId) === String(person?.id))
        .map((r) => r.organizerRating)
        .filter((v) => Number.isInteger(v) && v >= 1 && v <= 5),
    [reviews, person?.id]
  );

  const averageOrganizerRating = organizerRatings.length
    ? (organizerRatings.reduce((sum, v) => sum + v, 0) / organizerRatings.length).toFixed(1)
    : '—';

  const reviewsByPerson = reviews.filter(
    (review) => String(review.userId) === String(person.id)
  );

  const subtitle =
    [person.age && `${person.age} лет`, person.city].filter(Boolean).join(' · ') ||
    'Профиль участника';

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
        </div>

        {person.about && (
          <section className="person-profile-section">
            <h3>О себе</h3>
            <p>{person.about}</p>
          </section>
        )}

        <div className="person-profile-stats">
          <span>
            <strong>{personEvents.length}</strong>событий
          </span>
          <span>
            <strong>{averageOrganizerRating}</strong>оценка
          </span>
          <span>
            <strong>{reviewsByPerson.length}</strong>отзывов
          </span>
        </div>

        <section className="person-profile-section">
          <h3>Участвовал(а)</h3>
          {personEvents.length ? (
            <div className="person-events">
              {personEvents.slice(0, 20).map((event) => (
                <button key={event.id} onClick={() => onEventClick(event)}>
                  <img src={event.image} alt="" />
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