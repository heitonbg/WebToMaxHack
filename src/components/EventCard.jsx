import React from 'react';
import Icon from './Icon';
import EventOwnerMenu from './EventOwnerMenu';

const EventCard = ({
  event,
  onJoin,
  onLeave,
  onClick,
  isJoined,
  isLiked,
  onToggleLike,
  isOwner = false,
  onDelete,
  onEdit,
  pending,
}) => {
  const isFull = !isOwner && event.maxParticipants && event.participants >= event.maxParticipants && !isJoined;
  const isPending = Boolean(pending);

  const actionButton = (
    <button
      type="button"
      className={`join-btn-small ${!isOwner && isJoined ? 'leave' : ''}`}
      disabled={isPending || isFull}
      onClick={(e) => {
        e.stopPropagation();
        if (isPending) return;
        if (isOwner) onClick(event);
        else if (isFull) return;
        else if (isJoined && window.confirm('Отказаться от участия в мероприятии?')) onLeave?.(event);
        else onJoin(event);
      }}
    >
      {isPending
        ? '…'
        : isOwner
          ? 'Открыть событие'
          : isFull
            ? 'Мест нет'
            : isJoined
              ? 'Отказаться'
              : 'Присоединиться'}
    </button>
  );

  return (
    <div className={`event-card-horizontal ${isOwner ? 'event-card-owned' : ''}`} onClick={() => onClick(event)}>
      <div className="event-card-image">
        <img src={event.image} alt={event.title} loading="lazy" />
        <span className={`badge ${event.price === 'Бесплатно' ? 'free' : 'paid'}`}>
          {event.price}
        </span>
      </div>

      <div className="event-card-body">
        <div className="event-card-top">
          <span className="category-tag">{event.category}</span>
          {isOwner && <EventOwnerMenu event={event} onDelete={onDelete} onEdit={onEdit} />}
          <button
            className={`like-btn ${isLiked ? 'liked' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleLike?.(event.id); }}
            aria-label="Нравится"
          >
            <Icon name="heart" size={22} filled={isLiked} />
          </button>
        </div>

        <h3>{event.title}</h3>
        <p className="event-card-description">{event.description}</p>

        <div className="event-card-meta">
          <span><Icon name="calendar" size={15} /> {event.date}</span>
          {event.duration && (
            <span><Icon name="clock" size={15} /> {event.duration}</span>
          )}
          {event.format !== 'Онлайн' && event.district !== 'Онлайн' && <span><Icon name="pin" size={15} /> {event.distance}</span>}
          <span>
            <Icon name="people" size={15} /> {event.participants}
            {event.maxParticipants ? ` / ${event.maxParticipants}` : ''} участников
          </span>
        </div>

        {!isOwner && actionButton}
      </div>
      {isOwner && (
        <div className="event-card-footer">
          <span className="event-owner-badge">Вы организатор</span>
          {actionButton}
        </div>
      )}
    </div>
  );
};

export default EventCard;
