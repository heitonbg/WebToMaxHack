import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DesktopSidebar from './components/DesktopSidebar';
import SearchBar from './components/SearchBar';
import EventFeed from './components/EventFeed';
import EventMap from './components/EventMap';
import EventDetailModal from './components/EventDetailModal';
import OrganizerProfileModal from './components/OrganizerProfileModal';
import FiltersModal from './components/FiltersModal';
import CreateEventForm from './components/CreateEventForm';
import MyEvents from './components/MyEvents';
import Profile from './components/Profile';
import Icon from './components/Icon';
import { EventSkeletonList } from './components/EventSkeleton';
import {
  fetchEvents, fetchJoinedIds, createEvent, updateEvent,
  joinEvent, leaveEvent, deleteEvent,
  fetchReviews, addReview
} from './api/events';
import { isEventOwner } from './utils/eventOwnership';
import DeleteEventDialog from './components/DeleteEventDialog';
import { maxBridge } from './utils/maxBridge';
import { haversineDistance, formatDistance } from './utils/distance';
import { storage } from './utils/storage';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('feed');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedOrganizer, setSelectedOrganizer] = useState(null);
  const [joinedIds, setJoinedIds] = useState(() => storage.getJoined());
  const [likedIds, setLikedIds] = useState(() => storage.getLiked());
  const [user, setUser] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [lastCreatedEventId, setLastCreatedEventId] = useState(null);
  const [selectedCity, setSelectedCity] = useState('Казань');
  const [isCityOpen, setIsCityOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [editingEvent, setEditingEvent] = useState(null);
  const [sortBy, setSortBy] = useState(() => storage.getSort());
  const [notificationsOn, setNotificationsOn] = useState(() => storage.getNotifications());
  const [pendingActions, setPendingActions] = useState({});
  const [theme, setTheme] = useState(() => storage.getTheme());
  const [reviewsByEvent, setReviewsByEvent] = useState({});
  const userId = user?.id ?? 'guest';

  const pushToast = useCallback((text, variant = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, variant }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const requestDelete = (event) => {
    if (!isEventOwner(event, userId)) return;
    setDeleteError('');
    setPendingDelete(event);
  };

  const confirmDelete = async () => {
    if (!pendingDelete || deleting || !isEventOwner(pendingDelete, userId)) return;
    setDeleting(true);
    setDeleteError('');
    setPendingActions((p) => ({ ...p, [pendingDelete.id]: 'delete' }));
    try {
      await deleteEvent(pendingDelete.id, userId);
      const id = pendingDelete.id;
      setEvents((items) => items.filter((item) => item.id !== id));
      setJoinedIds((ids) => ids.filter((item) => item !== id));
      setLikedIds((ids) => ids.filter((item) => item !== id));
      setSelectedEvent((event) => (event?.id === id ? null : event));
      setLastCreatedEventId((previous) => (previous === id ? null : previous));
      setPendingDelete(null);
      pushToast('Событие удалено');
    } catch (error) {
      setDeleteError(error.message || 'Не удалось удалить событие. Попробуйте ещё раз.');
    } finally {
      setDeleting(false);
      setPendingActions((p) => {
        const next = { ...p };
        delete next[pendingDelete?.id];
        return next;
      });
    }
  };

  const track = (eventName, payload = {}) => {
    console.info('[MVP analytics]', eventName, payload);
  };

  useEffect(() => { storage.setJoined(joinedIds); }, [joinedIds]);
  useEffect(() => { storage.setLiked(likedIds); }, [likedIds]);
  useEffect(() => { storage.setSort(sortBy); }, [sortBy]);
  useEffect(() => { storage.setNotifications(notificationsOn); }, [notificationsOn]);
  useEffect(() => { storage.setTheme(theme); }, [theme]);
  useEffect(() => { document.body.dataset.theme = theme; }, [theme]);

  useEffect(() => {
    maxBridge.init();
    const u = maxBridge.getUser();
    if (u) setUser(u);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log('Геолокация недоступна')
      );
    }

    loadEvents();

    fetchJoinedIds(userId)
      .then((ids) => {
        if (Array.isArray(ids) && ids.length) {
          setJoinedIds((prev) => Array.from(new Set([...prev, ...ids])));
        }
      })
      .catch(() => {});

    const startParam = maxBridge.getStartParam?.();
    if (startParam?.startsWith('event_')) {
      const id = Number(startParam.replace('event_', ''));
      if (Number.isFinite(id)) {
        setTimeout(() => {
          setEvents((current) => {
            const ev = current.find((e) => e.id === id);
            if (ev) setSelectedEvent(ev);
            return current;
          });
        }, 400);
      }
    }

    track('feed_opened');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    const id = selectedEvent.id;
    fetchReviews(id)
      .then((revs) => setReviewsByEvent((prev) => ({ ...prev, [id]: revs })))
      .catch(() => {});
  }, [selectedEvent?.id]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await fetchEvents();
      setEvents(data);
    } catch (e) {
      console.error(e);
      pushToast('Не удалось загрузить события', 'error');
    } finally {
      setLoading(false);
    }
  };

  const quickFilters = useMemo(() => {
    const base = ['Сегодня', 'Бесплатно', 'Онлайн'];
    const cats = [...new Set(events.map((e) => e.category).filter(Boolean))];
    return [...base, ...cats];
  }, [events]);

  const activeFiltersCount = useMemo(() => {
    if (!filters) return 0;
    let count = 0;
    if (filters.category?.length) count += filters.category.length;
    if (filters.price) count += 1;
    if (filters.format) count += 1;
    if (filters.time) count += 1;
    if (filters.distance) count += 1;
    if (filters.pushkinCard) count += 1;
    return count;
  }, [filters]);

  const filteredEvents = useMemo(() => {
    let result = [...events];
    result = result.filter((event) => (event.city || 'Казань') === selectedCity);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) =>
        [e.title, e.description, e.category, e.address, e.district, e.organizer?.name]
          .filter(Boolean)
          .some((f) => String(f).toLowerCase().includes(q))
      );
    }

    if (quickFilter === 'Сегодня') {
      result = result.filter((e) => e.date.includes('Сегодня'));
    } else if (quickFilter === 'Бесплатно') {
      result = result.filter((e) => e.price === 'Бесплатно');
    } else if (quickFilter === 'Онлайн') {
      result = result.filter((e) => e.district === 'Онлайн' || e.format === 'Онлайн');
    } else if (quickFilter) {
      result = result.filter((e) => e.category === quickFilter);
    }

    if (filters) {
      const isOnline = (event) => event.format === 'Онлайн' || event.district === 'Онлайн';
      const parseDistance = (distance) => {
        const value = Number.parseFloat(String(distance).replace(',', '.'));
        return Number.isFinite(value) ? value : Infinity;
      };
      if (filters.category?.length) {
        result = result.filter((e) => filters.category.includes(e.category));
      }
      if (filters.price) {
        result = result.filter((e) =>
          filters.price === 'Платно' ? e.price !== 'Бесплатно' : e.price === filters.price
        );
      }
      if (filters.format === 'Онлайн') result = result.filter(isOnline);
      else if (filters.format === 'Офлайн') result = result.filter((e) => !isOnline(e));
      if (filters.time) result = result.filter((e) => e.date.includes(filters.time));
      if (filters.distance) {
        const maxDistance = Number.parseFloat(filters.distance.replace(/[^0-9.]/g, ''));
        result = result.filter((e) => parseDistance(e.distance) <= maxDistance);
      }
      if (filters.pushkinCard) result = result.filter((e) => e.price === 'Пушкинская карта');
    }

    if (userCoords) {
      result = result.map((e) => {
        if (e.lat && e.lng) {
          const dist = haversineDistance(userCoords.lat, userCoords.lng, e.lat, e.lng);
          return { ...e, distance: formatDistance(dist), _distanceValue: dist };
        }
        return { ...e, _distanceValue: 999 };
      });
    } else {
      result = result.map((e) => ({ ...e, _distanceValue: 999 }));
    }

    switch (sortBy) {
      case 'popular':
        result.sort((a, b) => (b.participants || 0) - (a.participants || 0));
        break;
      case 'new':
        result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      case 'distance':
      default:
        result.sort((a, b) => a._distanceValue - b._distanceValue);
    }

    return result;
  }, [events, searchQuery, quickFilter, filters, userCoords, selectedCity, sortBy]);

  const handleJoinEvent = async (event) => {
    if (isEventOwner(event, userId) || joinedIds.includes(event.id)) return;
    if (pendingActions[event.id]) return;
    if (event.maxParticipants && event.participants >= event.maxParticipants) {
      pushToast('Мест больше нет', 'error');
      return;
    }

    setPendingActions((p) => ({ ...p, [event.id]: 'join' }));
    setJoinedIds((ids) => [...ids, event.id]);
    setEvents((prev) => prev.map((e) =>
      e.id === event.id ? { ...e, participants: e.participants + 1 } : e
    ));

    try {
      maxBridge.haptic('medium');
      const res = await joinEvent(event.id, userId);
      if (typeof res.participants === 'number') {
        setEvents((prev) => prev.map((e) =>
          e.id === event.id ? { ...e, participants: res.participants } : e
        ));
        setSelectedEvent((prev) =>
          prev?.id === event.id ? { ...prev, participants: res.participants } : prev
        );
      }
      track('join_success', { eventId: event.id });
      maxBridge.sendData({
        action: 'join_event',
        eventId: event.id,
        eventTitle: event.title,
        eventTime: event.eventTime || null
      });
      pushToast(`Вы участвуете: «${event.title}»`);
    } catch (e) {
      setJoinedIds((ids) => ids.filter((id) => id !== event.id));
      setEvents((prev) => prev.map((ev) =>
        ev.id === event.id ? { ...ev, participants: Math.max(0, ev.participants - 1) } : ev
      ));
      pushToast(e.message || 'Не удалось присоединиться', 'error');
    } finally {
      setPendingActions((p) => {
        const next = { ...p };
        delete next[event.id];
        return next;
      });
    }
  };

  const handleLeaveEvent = async (event) => {
    if (isEventOwner(event, userId) || !joinedIds.includes(event.id)) return;
    if (pendingActions[event.id]) return;

    setPendingActions((p) => ({ ...p, [event.id]: 'leave' }));
    setJoinedIds((ids) => ids.filter((id) => id !== event.id));
    setEvents((prev) => prev.map((e) =>
      e.id === event.id ? { ...e, participants: Math.max(0, e.participants - 1) } : e
    ));

    try {
      const res = await leaveEvent(event.id, userId);
      if (typeof res.participants === 'number') {
        setEvents((prev) => prev.map((e) =>
          e.id === event.id ? { ...e, participants: res.participants } : e
        ));
        setSelectedEvent((prev) =>
          prev?.id === event.id ? { ...prev, participants: res.participants } : prev
        );
      }
      pushToast(`Вы отменили участие: «${event.title}»`);
    } catch (e) {
      setJoinedIds((ids) => [...ids, event.id]);
      setEvents((prev) => prev.map((ev) =>
        ev.id === event.id ? { ...ev, participants: ev.participants + 1 } : ev
      ));
      pushToast(e.message || 'Не удалось отменить участие', 'error');
    } finally {
      setPendingActions((p) => {
        const next = { ...p };
        delete next[event.id];
        return next;
      });
    }
  };

  const handleToggleLike = (eventId) => {
    setLikedIds((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    );
  };

  const handleCreateEvent = async (newEvent, editingId) => {
    try {
      if (editingId) {
        const updated = await updateEvent(editingId, newEvent, userId);
        setEvents((prev) => prev.map((e) => (e.id === editingId ? updated : e)));
        setSelectedEvent((prev) => (prev?.id === editingId ? updated : prev));
        setEditingEvent(null);
        setActiveTab('my');
        pushToast(`Событие «${updated.title}» обновлено`);
        return;
      }
      const created = await createEvent(newEvent);
      setEvents((prev) => [created, ...prev]);
      setLastCreatedEventId(created.id);
      setActiveTab('my');
      track('event_created', { title: created.title });
      maxBridge.haptic('success');
      maxBridge.sendData({ action: 'create_event', title: created.title });
      pushToast(`Событие «${created.title}» создано`);
    } catch (error) {
      pushToast(error.message || 'Не удалось сохранить событие', 'error');
      throw error;
    }
  };

  const handleEditEvent = (event) => {
    if (!isEventOwner(event, userId)) return;
    setEditingEvent(event);
    setSelectedEvent(null);
    setActiveTab('create');
  };

  const handleEventClick = (event) => {
    track('event_opened', { eventId: event.id });
    setSelectedOrganizer(null);
    setSelectedEvent(event);
  };

  const handleOpenOrganizer = (organizer) => {
    if (!organizer?.id) return;
    track('organizer_opened', { organizerId: organizer.id });
    setSelectedEvent(null);
    setSelectedOrganizer(organizer);
  };

  const handleApplyFilters = (f) => {
    setFilters(f);
    setQuickFilter(null);
  };

  const handleOpenChat = (event) => {
    track('chat_opened', { eventId: event.id });
    pushToast(`Чат «${event.title}» откроется в MAX после подключения бота`, 'info');
  };

  const handleCityChange = (city) => {
    setSelectedCity(city);
    setIsCityOpen(false);
    setQuickFilter(null);
    setFilters(null);
  };

  const handleAddReview = async (review) => {
    const created = await addReview(review);
    setReviewsByEvent((prev) => ({
      ...prev,
      [review.eventId]: [created, ...(prev[review.eventId] || [])]
    }));
    pushToast('Спасибо за отзыв!');
    return created;
  };

  const isExploreTab = activeTab === 'feed' || activeTab === 'map';

  return (
    <div className="app-container">
      <DesktopSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="main-content">
        {isExploreTab && (
          <>
            <div className="mobile-header">
              <div className="mobile-title-row">
                <h1>
                  События рядом{' '}
                  <button className="header-location" onClick={() => setIsCityOpen(true)}>
                    <span className="pin"><Icon name="pin" size={17} filled /></span>
                    {selectedCity}
                    <span className="chevron"><Icon name="chevronDown" size={14} /></span>
                  </button>
                </h1>
                <button
                  className={`header-more ${isMenuOpen ? 'active' : ''}`}
                  onClick={() => setIsMenuOpen((v) => !v)}
                  aria-label="Меню"
                >
                  <Icon name="more" size={24} />
                </button>
              </div>
              {user && <p className="greeting">Больше, чем просто планы</p>}
            </div>

            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onOpenFilters={() => setIsFiltersOpen(true)}
              activeFiltersCount={activeFiltersCount}
            />

            <div className="tabs-row">
              <button
                className={`tab-btn ${activeTab === 'feed' ? 'active' : ''}`}
                onClick={() => setActiveTab('feed')}
              >
                <span className="tab-icon"><Icon name="calendar" size={21} /></span> Лента
              </button>
              <button
                className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
                onClick={() => setActiveTab('map')}
              >
                <span className="tab-icon"><Icon name="map" size={21} /></span> Карта
              </button>
            </div>

            <div
              className="quick-filters"
              tabIndex="0"
              onWheel={(event) => {
                if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                  event.preventDefault();
                  event.currentTarget.scrollLeft += event.deltaY;
                }
              }}
            >
              {quickFilters.map((f) => (
                <button
                  key={f}
                  className={`chip ${quickFilter === f ? 'active' : ''}`}
                  onClick={() => setQuickFilter(quickFilter === f ? null : f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="content-area">
          {loading ? (
            <EventSkeletonList count={3} />
          ) : (
            <>
              {activeTab === 'feed' && (
                <EventFeed
                  userId={userId}
                  onDelete={requestDelete}
                  events={filteredEvents}
                  onJoin={handleJoinEvent}
                  onLeave={handleLeaveEvent}
                  onEventClick={handleEventClick}
                  joinedIds={joinedIds}
                  likedIds={likedIds}
                  onToggleLike={handleToggleLike}
                  pendingActions={pendingActions}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  activeFiltersCount={activeFiltersCount}
                  onResetFilters={() => { setFilters(null); setQuickFilter(null); }}
                  onCreate={() => {
                    track('create_started', { source: 'empty_feed' });
                    setEditingEvent(null);
                    setActiveTab('create');
                  }}
                />
              )}

              {activeTab === 'map' && (
                <EventMap
                  userId={userId}
                  onDelete={requestDelete}
                  events={filteredEvents}
                  onJoin={handleJoinEvent}
                  onLeave={handleLeaveEvent}
                  onEventClick={handleEventClick}
                  joinedIds={joinedIds}
                  likedIds={likedIds}
                  onToggleLike={handleToggleLike}
                  city={selectedCity}
                  userCoords={userCoords}
                />
              )}

              {activeTab === 'create' && (
                <CreateEventForm
                  onCreate={handleCreateEvent}
                  onCancel={() => { setEditingEvent(null); setActiveTab('feed'); }}
                  userId={user?.id || 'guest'}
                  userName={user?.first_name || user?.name}
                  city={selectedCity}
                  initialEvent={editingEvent}
                />
              )}

              {activeTab === 'my' && (
                <MyEvents
                  onDelete={requestDelete}
                  onEdit={handleEditEvent}
                  events={events}
                  onJoin={handleJoinEvent}
                  onLeave={handleLeaveEvent}
                  onEventClick={handleEventClick}
                  joinedIds={joinedIds}
                  likedIds={likedIds}
                  onToggleLike={handleToggleLike}
                  userId={user?.id || 'guest'}
                  showCreatedInitially={Boolean(lastCreatedEventId)}
                />
              )}

              {activeTab === 'profile' && (
                <Profile
                  user={user}
                  joinedIds={joinedIds}
                  createdCount={events.filter((e) => e.organizer && e.organizer.id === (user?.id || 'guest')).length}
                  notificationsOn={notificationsOn}
                  onToggleNotifications={setNotificationsOn}
                  theme={theme}
                  onToggleTheme={setTheme}
                  onLogout={() => pushToast('Профиль гостя остаётся активным в MVP', 'info')}
                />
              )}
            </>
          )}
        </div>

        <div className="bottom-nav">
          <button onClick={() => setActiveTab('feed')} className={activeTab === 'feed' ? 'active' : ''}>
            <span className="icon"><Icon name="home" size={23} filled /></span>
            <span>Главная</span>
          </button>
          <button
            onClick={() => { setEditingEvent(null); setActiveTab('create'); }}
            onClickCapture={() => track('create_started', { source: 'navigation' })}
            className={`create-btn ${activeTab === 'create' ? 'active' : ''}`}
          >
            <span className="icon-plus"><Icon name="plus" size={34} /></span>
          </button>
          <button onClick={() => setActiveTab('my')} className={activeTab === 'my' ? 'active' : ''}>
            <span className="icon"><Icon name="user" size={23} /></span>
            <span>Мои события</span>
          </button>
        </div>
      </div>

      {isFiltersOpen && (
        <FiltersModal
          onClose={() => setIsFiltersOpen(false)}
          onApply={handleApplyFilters}
          initialFilters={filters}
        />
      )}

      {selectedEvent && (
        <EventDetailModal
          onDelete={requestDelete}
          onEdit={handleEditEvent}
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onJoin={handleJoinEvent}
          onLeave={handleLeaveEvent}
          onOpenChat={handleOpenChat}
          onOpenOrganizer={handleOpenOrganizer}
          isJoined={joinedIds.includes(selectedEvent.id)}
          isLiked={likedIds.includes(selectedEvent.id)}
          onToggleLike={handleToggleLike}
          userId={userId}
          userName={user?.first_name || user?.name}
          reviews={reviewsByEvent[selectedEvent.id] || []}
          onAddReview={handleAddReview}
          relatedEvents={filteredEvents.filter(
            (e) => e.id !== selectedEvent.id && e.category === selectedEvent.category
          ).slice(0, 3)}
          onRelatedClick={handleEventClick}
          onShare={(ev) => {
            const link = `https://max.ru/@t184_hakaton_bot?start=event_${ev.id}`;
            maxBridge.shareContent({ text: `${ev.title}\n${ev.date}`, link });
          }}
        />
      )}

      {selectedOrganizer && (
        <OrganizerProfileModal
          organizer={selectedOrganizer}
          events={events.filter(
            (e) => String(e.organizer?.id) === String(selectedOrganizer.id)
          )}
          onClose={() => setSelectedOrganizer(null)}
          onEventClick={handleEventClick}
        />
      )}

      {pendingDelete && (
        <DeleteEventDialog
          event={pendingDelete}
          busy={deleting}
          error={deleteError}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}

      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <button
            key={t.id}
            className={`toast toast-${t.variant}`}
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          >
            <span>{t.variant === 'error' ? '⚠' : t.variant === 'info' ? 'ℹ' : '✓'}</span> {t.text}
          </button>
        ))}
      </div>

      {isCityOpen && (
        <div className="app-sheet-overlay" onClick={() => setIsCityOpen(false)}>
          <div className="app-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="app-sheet-head">
              <h2>Выберите город</h2>
              <button onClick={() => setIsCityOpen(false)}><Icon name="close" size={22} /></button>
            </div>
            {['Казань', 'Москва', 'Санкт-Петербург'].map((city) => (
              <button
                className={`city-option ${selectedCity === city ? 'active' : ''}`}
                key={city}
                onClick={() => handleCityChange(city)}
              >
                {city}<span>{selectedCity === city ? '✓' : ''}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {isMenuOpen && (
        <div className="header-menu">
          <button onClick={() => { setActiveTab('my'); setIsMenuOpen(false); }}>
            <Icon name="user" size={19} />Мои события
          </button>
          <button onClick={() => { setActiveTab('profile'); setIsMenuOpen(false); }}>
            <Icon name="grid" size={19} />О приложении
          </button>
          <button onClick={() => setIsMenuOpen(false)}>
            <Icon name="close" size={19} />Закрыть меню
          </button>
        </div>
      )}
    </div>
  );
}

export default App;