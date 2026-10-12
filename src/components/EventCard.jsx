import React from 'react';
import { formatEventDate } from '../utils/dateFormat';
import { getEventStatus, EVENT_STATUS_LABELS } from '../utils/eventFilters';
import { resolveEventImage } from '../utils/defaultEventImages';
import { formatEventPrice } from '../utils/eventPrice';
import Icon from './Icon';
import EventOwnerMenu from './EventOwnerMenu';

const FriendAvatars = ({ friends = [] }) => {
  if (!friends.length) return null;
  const visible = friends.slice(0, 3);
  const rest = friends.length - visible.length;
  return (
    <div className="event-card-friends" aria-label={`Идут друзья: ${friends.length}`}>
      <div className="event-card-friends-avatars">
        {visible.map((friend) => (
          <span key={friend.id} className="event-card-friend-avatar" title={friend.name || 'Друг'}>
            {friend.photo_url ? (
              <img src={friend.photo_url} alt="" />
            ) : (
              (friend.name || 'Д').slice(0, 1).toUpperCase()
            )}
          </span>
        ))}
        {rest > 0 && (
          <span className="event-card-friend-avatar event-card-friend-avatar--more">
            +{rest}
          </span>
        )}
      </div>
      <span className="event-card-friends-label">
        {friends.length === 1
          ? `${friends[0].name || 'Друг'} идёт`
          : `Идут ${friends.length} друзей`}
      </span>
    </div>
  );
};

const EventCard = ({
  event,
  onJoin,
  onLeave,
  onLeaveRequest,
  onClick,
  isJoined,
  isLiked,
  onToggleLike,
  isOwner = false,
  onDelete,
  onEdit,
  onClosePreview,
  pending,
}) => {
  const status = getEventStatus(event);
  const showStatusBadge = status === 'soon' || status === 'live';
  const statusLabel = showStatusBadge ? EVENT_STATUS_LABELS[status] : '';
  const priceLabel = formatEventPrice(event);

  const isFull =
    !isOwner &&
    event.maxParticipants &&
    event.participants >= event.maxParticipants &&
    !isJoined;
  const isPending = Boolean(pending);
  const isPast = status === 'past';

  const friendGoers = Array.isArray(event.friendGoers) ? event.friendGoers : [];
  const hasFriends = friendGoers.length > 0 && !isOwner;

  const actionButton = (
    <button
      type="button"
      className={`join-btn-small ${!isOwner && isJoined ? 'leave' : ''}`}
      disabled={isPending || isFull || isPast}
      onClick={(e) => {
        e.stopPropagation();
        if (isPending || isPast) return;
        if (isOwner) onClick(event);
        else if (isFull) return;
        else if (isJoined) (onLeaveRequest || onLeave)?.(event);
        else onJoin(event);
      }}
    >
      {isPending
        ? '…'
        : isPast
          ? 'Завершено'
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
    <div
      className={`event-card-horizontal ${isOwner ? 'event-card-owned' : ''} ${
        status === 'live' ? 'event-card-live' : ''
      }`}
      onClick={() => onClick(event)}
    >
      <div className="event-card-image">
        <img src={resolveEventImage(event)} alt={event.title} loading="lazy" />
        <span
          className={`badge ${event.price === 'Бесплатно' ? 'free' : 'paid'} ${
            event.price === 'Пушкинская карта' ? 'pushkin' : ''
          }`}
          title={event.price === 'Платно' ? `Платно — ${priceLabel}` : priceLabel}
        >
          {priceLabel}
        </span>
        {hasFriends && (
          <span className="badge friend-going-badge" title="Друг идёт">
            👥 Друг
          </span>
        )}
      </div>

      <div className="event-card-body">
        <div className="event-card-top">
          <div className="event-card-tags">
            <span className="category-tag">{event.category}</span>
            {showStatusBadge && (
              <span className={`status-tag status-tag-${status}`}>{statusLabel}</span>
            )}
          </div>
          {isOwner && (
            <EventOwnerMenu
              event={event}
              onDelete={onDelete}
              onEdit={onEdit}
              isPast={isPast}
            />
          )}
          <button
            className={`like-btn ${isLiked ? 'liked' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike?.(event.id);
            }}
            aria-label="Нравится"
          >
            <Icon name="heart" size={22} filled={isLiked} />
          </button>
          {onClosePreview && (
            <button
              type="button"
              className="map-preview-close-inline"
              aria-label="Закрыть карточку на карте"
              title="Закрыть карточку"
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                onClosePreview();
              }}
            >
              <Icon name="close" size={17} />
            </button>
          )}
        </div>

        <h3>{event.title}</h3>
        <p className="event-card-description">{event.description}</p>

        {hasFriends && <FriendAvatars friends={friendGoers} />}

        <div className="event-card-meta">
          <span>
            <Icon name="calendar" size={15} /> {formatEventDate(event)}
          </span>
          {event.duration && (
            <span>
              <Icon name="clock" size={15} /> {event.duration}
            </span>
          )}
          {event.format !== 'Онлайн' && event.district !== 'Онлайн' && (
            <span>
              <Icon name="pin" size={15} /> {event.distance || '0 км'}
            </span>
          )}
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