import React from 'react';
import Icon from './Icon';

export default function UserProfileModal({ person, events = [], reviews = [], onClose, onEventClick }) {
  const reviewsByPerson = reviews.filter((review) => String(review.userId) === String(person.id));
  const average = reviewsByPerson.length
    ? (reviewsByPerson.reduce((sum, review) => sum + review.rating, 0) / reviewsByPerson.length).toFixed(1)
    : '—';

  const subtitle = [person.age && `${person.age} лет`, person.city]
    .filter(Boolean)
    .join(' · ') || 'Профиль участника';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section
        className="modal-content person-profile-modal"
        onClick={(e) => e.stopPropagation()}
        aria-labelledby="person-profile-title"
      >
        <button className="close-btn person-profile-close" onClick={onClose} aria-label="Закрыть">
          <Icon name="close" size={22} />
        </button>

        <div className="person-profile-hero">
          <span className="person-profile-avatar">
            {person.photo_url
              ? <img src={person.photo_url} alt={person.name || 'Участник'} />
              : (person.name?.slice(0, 1).toUpperCase() || 'У')}
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
          <span><strong>{events.length}</strong>событий</span>
          <span><strong>{average}</strong>оценка</span>
          <span><strong>{reviewsByPerson.length}</strong>отзывов</span>
        </div>

        <section className="person-profile-section">
          <h3>Участвовал(а)</h3>
          {events.length ? (
            <div className="person-events">
              {events.map((event) => (
                <button key={event.id} onClick={() => onEventClick(event)}>
                  <img src={event.image} alt="" />
                  <span>
                    <strong>{event.title}</strong>
                    <small>{event.date}</small>
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