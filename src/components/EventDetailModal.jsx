import React, { useEffect, useState } from 'react';
import { formatEventDate } from '../utils/dateFormat';
import Icon from './Icon';
import EventOwnerMenu from './EventOwnerMenu';
import EventLocationMap from './EventLocationMap';
import Reviews from './Reviews';
import { isEventOwner } from '../utils/eventOwnership';

const EventDetailModal = ({
  event, onClose, onJoin, onLeave, onDelete, onEdit, onOpenChat,
  onOpenOrganizer, onOpenParticipants,
  isJoined, isLiked, onToggleLike, userId, userName,
  reviews = [], onAddReview,
  relatedEvents = [], onRelatedClick, onShare
}) => {
  const isOwner = isEventOwner(event, userId);
  const [photoIndex, setPhotoIndex] = useState(0);
  const gallery = (event.images?.length ? event.images : [event.image]).filter(Boolean);

  useEffect(() => setPhotoIndex(0), [event.id]);
  useEffect(() => {
    if (photoIndex >= gallery.length) setPhotoIndex(0);
  }, [gallery.length, photoIndex]);

  const showPhoto = (direction) => {
    if (gallery.length < 2) return;
    setPhotoIndex((index) => (index + direction + gallery.length) % gallery.length);
  };

  const handleShare = async () => {
    if (onShare) { onShare(event); return; }
    const text = `${event.title}\n${event.date}\n${isJoined ? event.address : event.district}`;
    if (navigator.share) {
      try { await navigator.share({ title: event.title, text }); return; } catch {}
    }
    if (navigator.clipboard) await navigator.clipboard.writeText(text);
  };

  const handleOpenOrganizer = () => {
    if (!event.organizer?.id) return;
    onOpenOrganizer?.(event.organizer);
  };
  const handleLeave = () => {
    if (window.confirm('Отказаться от участия в мероприятии?')) onLeave(event);
  };

  // ★ Роль организатора: «Вы организатор» или «Организатор»
  const organizerRole = isOwner ? 'Вы организатор' : 'Организатор';

  // ★ Детали профиля: возраст и город
  const organizerDetails = [
    event.organizer?.age && `${event.organizer.age} лет`,
    event.organizer?.city,
  ].filter(Boolean).join(' · ');

  return (
    <div className="modal-overlay detail-overlay" onClick={onClose}>
      <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`detail-hero ${isOwner ? 'is-owner' : ''}`}>
          {isOwner && <EventOwnerMenu event={event} onDelete={onDelete} onEdit={onEdit} />}
          <img
            src={gallery[photoIndex] || event.image}
            alt={`${event.title}, фото ${photoIndex + 1}`}
            className="detail-image"
          />
          <button onClick={onClose} className="hero-round-btn hero-back" aria-label="Назад">
            <Icon name="arrowLeft" size={24} />
          </button>
          <button
            className={`hero-round-btn hero-like ${isLiked ? 'active' : ''}`}
            onClick={() => onToggleLike(event.id)}
            aria-label={isLiked ? 'Убрать из избранного' : 'В избранное'}
          >
            <Icon name="heart" size={23} filled={isLiked} />
          </button>
          {gallery.length > 1 && (
            <>
              <button className="gallery-arrow gallery-prev" onClick={() => showPhoto(-1)} aria-label="Предыдущее фото">
                <Icon name="chevronRight" size={25} />
              </button>
              <button className="gallery-arrow gallery-next" onClick={() => showPhoto(1)} aria-label="Следующее фото">
                <Icon name="chevronRight" size={25} />
              </button>
            </>
          )}
          <span className={`badge ${event.price === 'Бесплатно' ? 'free' : 'paid'} hero-price`}>{event.price}</span>
          <span className="hero-counter">{photoIndex + 1} / {gallery.length}</span>
        </div>

        <div className="detail-body">
          <span className="category-tag">{event.category}</span>
          <h2>{event.title}</h2>

          {(event.format === 'Онлайн' || event.district === 'Онлайн') && (
            <div className="online-event-notice">
              <Icon name="monitor" size={17} /> Онлайн-событие
            </div>
          )}

          <div className="detail-top-facts">
            <div>
              <Icon name="calendar" size={26} />
              <strong>{formatEventDate(event.date)}</strong>
              <small>Встреча</small>
            </div>
            {event.duration && (
              <div>
                <Icon name="clock" size={26} />
                <strong>{event.duration}</strong>
                <small>Длительность</small>
              </div>
            )}
            {event.format !== 'Онлайн' && event.district !== 'Онлайн' && (
              <div>
                <Icon name="pin" size={26} />
                <strong>{event.distance}</strong>
                <small>от вас</small>
              </div>
            )}
            <button
              type="button"
              className="detail-fact-button"
              onClick={() => onOpenParticipants?.(event)}
            >
              <Icon name="people" size={26} />
              <strong>
                {event.participants}{event.maxParticipants ? ` / ${event.maxParticipants}` : ''}
              </strong>
              <small>
                {event.maxParticipants && event.participants >= event.maxParticipants
                  ? 'Мест нет'
                  : 'Смотреть участников'}
              </small>
            </button>
          </div>

          {/* ★ Карточка организатора: фото организатора, роль, имя, детали */}
          <button
            className="venue-card"
            type="button"
            onClick={handleOpenOrganizer}
            disabled={!event.organizer?.id}
          >
            {event.organizer?.photo_url ? (
              <img
                src={event.organizer.photo_url}
                alt={event.organizer.name || 'Организатор'}
              />
            ) : (
              <span className="venue-card-avatar" aria-hidden="true">
                {(event.organizer?.name || 'О').slice(0, 1).toUpperCase()}
              </span>
            )}
            <span>
              <small className="venue-card-role">{organizerRole}</small>
              <strong>{event.organizer?.name || 'Организатор'}</strong>
              {organizerDetails && <small>{organizerDetails}</small>}
            </span>
            <Icon name="chevronRight" size={21} />
          </button>

          <EventLocationMap event={event} />

          {event.description?.trim() && (
            <section className="detail-section">
              <h3>О событии</h3>
              <p>{event.description}</p>
            </section>
          )}

          <Reviews
            event={event}
            userId={userId}
            userName={userName}
            reviews={reviews}
            onSubmit={onAddReview}
          />

          {relatedEvents.length > 0 && (
            <section className="detail-section related-section">
              <h3>Похожие события</h3>
              <div className="related-list">
                {relatedEvents.map((rel) => (
                  <button
                    key={rel.id}
                    className="related-card"
                    onClick={() => { onClose(); onRelatedClick?.(rel); }}
                  >
                    <img src={rel.image} alt={rel.title} />
                    <span>
                      <strong>{rel.title}</strong>
                      <small>{rel.date}{rel.duration ? ` · ${rel.duration}` : ''}</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="detail-actions">
            {isOwner ? (
              <div className="joined-status">
                Вы организатор этого события. Управление — в меню «⋯» сверху.
              </div>
            ) : isJoined ? (
              <>
                <div className="joined-status">Вы участвуете</div>
                <button className="primary-btn" onClick={() => onOpenChat(event)}>Перейти в чат</button>
                <button className="leave-btn" onClick={handleLeave}>Отказаться</button>
              </>
            ) : (
              <button
                className="primary-btn"
                disabled={event.maxParticipants && event.participants >= event.maxParticipants}
                onClick={() => onJoin(event)}
              >
                {event.maxParticipants && event.participants >= event.maxParticipants
                  ? 'Мест нет'
                  : 'Присоединиться'}
              </button>
            )}
            <button className="share-btn" onClick={handleShare}>
              <Icon name="share" size={20} /> Поделиться
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailModal;