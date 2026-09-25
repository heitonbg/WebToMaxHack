import React from 'react';
import EventCard from './EventCard';
import Icon from './Icon';
import { isEventOwner } from '../utils/eventOwnership';

const SORT_OPTIONS = [
  { id: 'distance', label: 'Ближайшие' },
  { id: 'popular', label: 'Популярные' },
  { id: 'new', label: 'Новые' },
];

const EventFeed = ({
  events,
  onJoin,
  onLeave,
  onEventClick,
  joinedIds,
  likedIds,
  onToggleLike,
  onCreate,
  userId,
  onDelete,
  pendingActions = {},
  sortBy = 'distance',
  onSortChange,
  activeFiltersCount = 0,
  onResetFilters,
}) => {
  if (!events.length) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <Icon name="search" size={44} />
        </div>
        <h3>Событий не найдено</h3>
        <p>
          {activeFiltersCount > 0
            ? 'Попробуйте изменить фильтры или сбросить их.'
            : 'Рядом пока нет подходящих встреч. Возможно, кто-то ищет компанию так же, как и вы.'}
        </p>
        {activeFiltersCount > 0 && (
          <button className="empty-create-btn" onClick={onResetFilters}>
            Сбросить фильтры
          </button>
        )}
        <button className="empty-create-btn" onClick={onCreate}>
          Создать событие
        </button>
      </div>
    );
  }

  return (
    <>
      {onSortChange && (
        <div className="sort-row">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              className={`sort-chip ${sortBy === opt.id ? 'active' : ''}`}
              onClick={() => onSortChange(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      <div className="event-feed">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isOwner={isEventOwner(event, userId)}
            onDelete={onDelete}
            onJoin={onJoin}
            onLeave={onLeave}
            onClick={onEventClick}
            isJoined={joinedIds.includes(event.id)}
            isLiked={likedIds.includes(event.id)}
            onToggleLike={onToggleLike}
            pending={pendingActions[event.id]}
          />
        ))}
      </div>
    </>
  );
};

export default EventFeed;