import React from 'react';
import Icon from './Icon';

export default function ParticipantsModal({ event, participants, onClose, onOpenProfile }) {
  return <div className="modal-overlay" onClick={onClose}>
    <section className="modal-content participants-modal" onClick={(e) => e.stopPropagation()} aria-labelledby="participants-title">
      <div className="participants-head">
        <div><h2 id="participants-title">Участники</h2><p>{event.title}</p></div>
        <button className="close-btn" onClick={onClose} aria-label="Закрыть"><Icon name="close" size={22} /></button>
      </div>
      <p className="participants-count">{event.participants} записались · показаны доступные профили</p>
      <div className="participants-list">
        {participants.map((person) => <button className="participant-row" key={person.id} onClick={() => onOpenProfile(person)}>
          <span className="participant-avatar">{person.name.slice(0, 1).toUpperCase()}</span>
          <span><strong>{person.name}</strong><small>{[person.age && `${person.age} лет`, person.city].filter(Boolean).join(' · ') || 'Участник'}</small></span>
          <Icon name="chevronRight" size={20} />
        </button>)}
      </div>
    </section>
  </div>;
}
