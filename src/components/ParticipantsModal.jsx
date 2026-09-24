import React from 'react';
import Icon from './Icon';

export default function ParticipantsModal({
  event,
  participants,
  loading,
  organizerId,
  onClose,
  onOpenProfile,
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <section
        className="modal-content participants-modal"
        onClick={(e) => e.stopPropagation()}
        aria-labelledby="participants-title"
      >
        <div className="participants-head">
          <div>
            <h2 id="participants-title">Участники</h2>
            <p>{event.title}</p>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Закрыть">
            <Icon name="close" size={22} />
          </button>
        </div>

        <p className="participants-count">
          {event.participants} записались
          {!loading && participants.length > 0 && ' · показаны доступные профили'}
        </p>

        {loading ? (
          <div className="participants-list">
            {[1, 2, 3].map((i) => (
              <div key={i} className="participant-row" style={{ opacity: 0.5 }}>
                <span className="participant-avatar" />
                <span>
                  <strong>Загрузка…</strong>
                  <small />
                </span>
              </div>
            ))}
          </div>
        ) : participants.length === 0 ? (
          <p className="participants-empty">Пока никто не записался</p>
        ) : (
          <div className="participants-list">
            {participants.map((person) => {
              const isOrganizer = organizerId && String(person.id) === String(organizerId);
              return (
                <button
                  className="participant-row"
                  key={person.id}
                  onClick={() => onOpenProfile(person)}
                >
                  <span className="participant-avatar">
                    {person.photo_url
                      ? <img src={person.photo_url} alt={person.name || 'Участник'} />
                      : (person.name || 'У').slice(0, 1).toUpperCase()}
                  </span>
                  <span>
                    <strong>
                      {person.name || 'Участник'}
                      {isOrganizer && <span className="participant-badge">Организатор</span>}
                    </strong>
                    <small>
                      {[person.age && `${person.age} лет`, person.city]
                        .filter(Boolean)
                        .join(' · ') || 'Профиль'}
                    </small>
                  </span>
                  <Icon name="chevronRight" size={20} />
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}