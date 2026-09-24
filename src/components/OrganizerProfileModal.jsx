import React from 'react';
import Icon from './Icon';

const OrganizerProfileModal = ({ organizer, events = [], onClose, onEventClick }) => {
  if (!organizer) return null;

  const initials = (organizer.name || 'О')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const ratedEvents = events.filter((e) => (e.rating || 0) > 0);
  const avgRating = ratedEvents.length
    ? (ratedEvents.reduce((sum, e) => sum + (e.rating || 0), 0) / ratedEvents.length).toFixed(1)
    : '0.0';

  const totalParticipants = events.reduce((sum, e) => sum + (e.participants || 0), 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content organizer-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn organizer-close" onClick={onClose} aria-label="Закрыть">
          <Icon name="close" size={22} />
        </button>

        <div className="organizer-hero">
          <div className="organizer-avatar-large">{initials}</div>
          <h2 className="organizer-name">{organizer.name || 'Организатор'}</h2>
          <p className="organizer-subtitle">Организатор событий</p>
        </div>

        <div className="organizer-stats">
          <div className="organizer-stat">
            <div className="organizer-stat-value">{events.length}</div>
            <div className="organizer-stat-label">Событий</div>
          </div>
          <div className="organizer-stat">
            <div className="organizer-stat-value">{totalParticipants}</div>
            <div className="organizer-stat-label">Участников</div>
          </div>
          <div className="organizer-stat">
            <div className="organizer-stat-value">
              <Icon name="star" size={16} filled /> {avgRating}
            </div>
            <div className="organizer-stat-label">Рейтинг</div>
          </div>
        </div>

        <div className="organizer-section">
          <h3 className="organizer-section-title">
            События организатора ({events.length})
          </h3>

          {events.length === 0 ? (
            <p className="organizer-empty">Пока нет событий</p>
          ) : (
            <div className="organizer-events-list">
              {events.map((event) => (
                <button
                  key={event.id}
                  className="organizer-event-card"
                  onClick={() => {
                    onClose();
                    onEventClick?.(event);
                  }}
                >
                  <img src={event.image} alt={event.title} />
                  <span className="organizer-event-info">
                    <strong>{event.title}</strong>
                    <small>{event.date}</small>
                    <small className="organizer-event-meta">
                      {event.duration && (
                        <>
                          <Icon name="clock" size={13} /> {event.duration} ·{' '}
                        </>
                      )}
                      <Icon name="people" size={13} /> {event.participants} · {event.distance}
                    </small>
                  </span>
                  <Icon name="chevronRight" size={20} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizerProfileModal;