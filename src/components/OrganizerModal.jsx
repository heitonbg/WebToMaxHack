import React from 'react';
import Icon from './Icon';

const OrganizerModal = ({ isOpen, onClose, organizer, eventsCount }) => {
  if (!isOpen) return null;

  const initial = organizer?.name?.charAt(0).toUpperCase() || 'О';
  const shortName = organizer?.name || 'Организатор';

  return (
    <div className="modal-overlay detail-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '430px',
          borderRadius: '24px 24px 0 0',
          padding: '24px 20px 32px'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Организатор</h2>
          <button className="close-btn" onClick={onClose} aria-label="Закрыть">
            <Icon name="close" size={22} />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            marginBottom: '24px'
          }}
        >
          <div
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2786f8, #155fd8)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '38px',
              fontWeight: 800,
              marginBottom: '14px',
              boxShadow: '0 8px 24px rgba(39,134,248,.3)'
            }}
          >
            {initial}
          </div>
          <h3
            style={{
              fontSize: '20px',
              fontWeight: 800,
              marginBottom: '6px'
            }}
          >
            {shortName}
          </h3>
          <p style={{ fontSize: '13px', color: '#7b899d' }}>
            Организатор событий в MAX Events
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '20px'
          }}
        >
          <div
            style={{
              background: '#f7f9fc',
              padding: '14px 8px',
              borderRadius: '14px',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#2786f8',
                marginBottom: '4px'
              }}
            >
              {eventsCount || 0}
            </div>
            <div style={{ fontSize: '11px', color: '#7b899d' }}>
              Событий
            </div>
          </div>
          <div
            style={{
              background: '#f7f9fc',
              padding: '14px 8px',
              borderRadius: '14px',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#2786f8',
                marginBottom: '4px'
              }}
            >
              0
            </div>
            <div style={{ fontSize: '11px', color: '#7b899d' }}>
              Подписчиков
            </div>
          </div>
          <div
            style={{
              background: '#f7f9fc',
              padding: '14px 8px',
              borderRadius: '14px',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#2786f8',
                marginBottom: '4px'
              }}
            >
              —
            </div>
            <div style={{ fontSize: '11px', color: '#7b899d' }}>
              Рейтинг
            </div>
          </div>
        </div>

        <button
          type="button"
          className="primary-btn"
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '14px',
            background: '#2786f8',
            color: '#fff',
            fontWeight: 700,
            fontSize: '15px',
            marginBottom: '8px'
          }}
          onClick={() => {
            onClose();
          }}
        >
          Написать организатору
        </button>

        <p
          style={{
            fontSize: '11px',
            color: '#8190a3',
            textAlign: 'center',
            marginTop: '8px'
          }}
        >
          Связь через MAX откроется после подключения бота
        </p>
      </div>
    </div>
  );
};

export default OrganizerModal;