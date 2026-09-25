import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import DesktopSidebar from './components/DesktopSidebar';
import SearchBar from './components/SearchBar';
import EventFeed from './components/EventFeed';
import EventMap from './components/EventMap';
import EventDetailModal from './components/EventDetailModal';
import OrganizerProfileModal from './components/OrganizerProfileModal';
import ParticipantsModal from './components/ParticipantsModal';
import UserProfileModal from './components/UserProfileModal';
import FiltersModal from './components/FiltersModal';
import CreateEventForm from './components/CreateEventForm';
import MyEvents from './components/MyEvents';
import Profile from './components/Profile';
import Icon from './components/Icon';
import CityPickerModal from './components/CityPickerModal';
import { EventSkeletonList } from './components/EventSkeleton';
import {
  fetchEvents,
  fetchBootstrap,
  createEvent,
  updateEvent,
  joinEvent,
  leaveEvent,
  deleteEvent,
  fetchReviews,
  addReview,
  fetchUser,
  updateUser,
  fetchParticipants,
} from './api/events';
import { isEventOwner } from './utils/eventOwnership';
import DeleteEventDialog from './components/DeleteEventDialog';
import { maxBridge } from './utils/maxBridge';
import { haversineDistance, formatDistance, eventBelongsToCity } from './utils/distance';
import { storage } from './utils/storage';
import { cityStorage } from './utils/cityStorage';
import { findCityByName, getAllCities } from './utils/citySearch';
import {
  matchesTimeFilter,
  isOnlineEvent,
  matchesConfiguredFilters,
  getEventStatus,
} from './utils/eventFilters';
import './App.css';

// Миграция: старый ключ joined в localStorage больше не используется
try {
  localStorage.removeItem('max_events_joined_v1');
} catch {}

const DEFAULT_CITY =
  findCityByName('Казань') ||
  findCityByName('Казан') ||
  getAllCities().find((c) => c.name === 'Москва') ||
  getAllCities()[0];

const BOT_USERNAME = String(
  import.meta.env.VITE_BOT_USERNAME || 't280_hakaton_max_bot'
).replace(/^@/, '');

function App() {
  const [activeTab, setActiveTab] = useState('feed');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [filters, setFilters] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedOrganizer, setSelectedOrganizer] = useState(null);
  const [participantsEvent, setParticipantsEvent] = useState(null);
  const [participantProfiles, setParticipantProfiles] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);

  // ★ Всё приходит с сервера через /api/bootstrap
  const [joinedIds, setJoinedIds] = useState([]);
  const [participatedIds, setParticipatedIds] = useState([]);
  const [createdIds, setCreatedIds] = useState([]);
  const [likedIds, setLikedIds] = useState(() => storage.getLiked());

  const [user, setUser] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [lastCreatedEventId, setLastCreatedEventId] = useState(null);
  const [selectedCity, setSelectedCity] = useState(() => {
    const saved = cityStorage.get();
    return findCityByName(saved?.name) || DEFAULT_CITY;
  });
  const [isCityOpen, setIsCityOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [editingEvent, setEditingEvent] = useState(null);
  const [sortBy, setSortBy] = useState(() => storage.getSort());
  const [notificationsOn, setNotificationsOn] = useState(() => storage.getNotifications());
  const [pendingActions, setPendingActions] = useState({});
  const [theme, setTheme] = useState(() => storage.getTheme());
  const [reviewsByEvent, setReviewsByEvent] = useState({});

  // ★ userId — только реальный. Без 'guest'.
  //   Пока MAX Bridge не отдал user, userId = null, и мы ничего не грузим.
  const userId = user?.id ? String(user.id) : null;
  const currentUserIdRef = useRef(userId);

  const themeChangeCount = useRef(0);
  const [profile, setProfile] = useState(() => storage.getProfile(userId || 'anon'));

  const pushToast = useCallback((text, variant = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, variant }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  // ★ Единая загрузка всего, что касается пользователя
  const loadBootstrap = useCallback(async (id) => {
    if (!id) return;
    try {
      const data = await fetchBootstrap(id);
      if (!data) return;

      // ★ Защита от race: если за время запроса userId сменился — игнорируем
      if (String(currentUserIdRef.current) !== String(id)) return;

      if (Array.isArray(data.joinedIds)) {
        setJoinedIds(data.joinedIds.map(Number).filter(Number.isFinite));
      }
      if (Array.isArray(data.participatedIds)) {
        setParticipatedIds(data.participatedIds.map(Number).filter(Number.isFinite));
      }
      if (Array.isArray(data.createdIds)) {
        setCreatedIds(data.createdIds.map(Number).filter(Number.isFinite));
      }

      if (data.user && typeof data.user === 'object') {
        setProfile((prev) => ({ ...prev, ...data.user }));
        storage.setProfile(id, { ...(storage.getProfile(id) || {}), ...data.user });

        if (typeof data.user.notificationsEnabled === 'boolean') {
          setNotificationsOn(data.user.notificationsEnabled);
          storage.setNotifications(data.user.notificationsEnabled);
        }
        if (['light', 'dark'].includes(data.user.theme)) {
          storage.setTheme(data.user.theme);
          document.body.dataset.theme = data.user.theme;
          setTheme(data.user.theme);
        }
      }
    } catch (e) {
      console.warn('Не удалось загрузить bootstrap', e);
    }
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
      loadBootstrap(userId);
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

  useEffect(() => {
    storage.setLiked(likedIds);
  }, [likedIds]);
  useEffect(() => {
    storage.setSort(sortBy);
  }, [sortBy]);
  useEffect(() => {
    storage.setNotifications(notificationsOn);
  }, [notificationsOn]);
  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    cityStorage.set(selectedCity);
  }, [selectedCity]);

  // ★ Держим актуальный userId в ref — для guard'а внутри loadBootstrap
  useEffect(() => {
    currentUserIdRef.current = userId;
  }, [userId]);

  // -------- Локальный кэш профиля --------
  useEffect(() => {
    if (!userId) return;
    const cached = storage.getProfile(userId);
    if (cached && Object.keys(cached).length) {
      setProfile(cached);
    }
  }, [userId]);

  const handleToggleTheme = (next) => {
    if (next !== 'light' && next !== 'dark') return;
    themeChangeCount.current += 1;
    storage.setTheme(next);
    document.body.dataset.theme = next;
    setTheme(next);
    if (userId)
      updateUser(userId, { theme: next }).catch((error) =>
        console.warn('Не удалось сохранить тему на сервере', error)
      );
  };

  const handleToggleNotifications = (next) => {
    if (typeof next !== 'boolean') return;
    setNotificationsOn(next);
    storage.setNotifications(next);
    if (userId) {
      updateUser(userId, { notificationsEnabled: next }).catch((error) =>
        console.warn('Не удалось сохранить настройку уведомлений', error)
      );
    }
  };

  // -------- Старт: MAX Bridge + события --------
  useEffect(() => {
    maxBridge.init();

    // ★ MAX Bridge может отдавать user асинхронно.
    //   Ждём появления user до 3 секунд.
    let attempts = 0;
    const tryGetUser = () => {
      const u = maxBridge.getUser();
      if (u?.id) {
        setUser(u);
        return;
      }
      attempts += 1;
      if (attempts < 30) {
        setTimeout(tryGetUser, 100);
      } else {
        console.warn('[App] MAX Bridge не отдал пользователя за 3 секунды');
      }
    };
    tryGetUser();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log('Геолокация недоступна')
      );
    }

    loadEvents();

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

  // ★ Bootstrap — только для реального userId, один раз
  useEffect(() => {
    if (!userId) return;
    loadBootstrap(userId);
  }, [userId, loadBootstrap]);

  // -------- Reviews для открытого события --------
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
    const base = [
      'Сегодня',
      'Бесплатно',
      'Онлайн',
      'Пушкинская карта',
      'Волонтёрство',
      'Спорт',
      'Свободен сейчас',
      'Туристический режим',
    ];
    const cats = [...new Set(events.map((e) => e.category).filter(Boolean))];
    return [...new Set([...base, ...cats])];
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

    if (selectedCity) {
      result = result.filter((event) => {
        if (event.city && selectedCity.name) {
          if (event.city === selectedCity.name) return true;
        }
        return eventBelongsToCity(event, selectedCity, 40);
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) =>
        [e.title, e.description, e.category, e.address, e.district, e.organizer?.name]
          .filter(Boolean)
          .some((f) => String(f).toLowerCase().includes(q))
      );
    }

    if (quickFilter === 'Сегодня') {
      result = result.filter((e) => matchesTimeFilter(e, 'Сегодня'));
    } else if (quickFilter === 'Бесплатно') {
      result = result.filter((e) => e.price === 'Бесплатно');
    } else if (quickFilter === 'Онлайн') {
      result = result.filter(isOnlineEvent);
    } else if (quickFilter === 'Пушкинская карта') {
      result = result.filter((e) => e.price === 'Пушкинская карта');
    } else if (quickFilter === 'Волонтёрство') {
      result = result.filter((e) =>
        /волонт/i.test(`${e.category || ''} ${e.title || ''} ${e.description || ''}`)
      );
    } else if (quickFilter === 'Спорт') {
      result = result.filter((e) => /спорт/i.test(e.category || ''));
    } else if (quickFilter === 'Свободен сейчас') {
      result = result.filter((e) => matchesTimeFilter(e, 'Сейчас'));
    } else if (quickFilter === 'Туристический режим') {
      result = result.filter((e) => matchesTimeFilter(e, 'Сегодня'));
    } else if (quickFilter) {
      result = result.filter((e) => e.category === quickFilter);
    }

    if (filters) result = result.filter((e) => matchesConfiguredFilters(e, filters, userCoords));

    const showPast = filters?.time === 'Сейчас';
    if (!showPast) {
      result = result.filter((e) => getEventStatus(e) !== 'past');
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

    if (quickFilter === 'Туристический режим') {
      result.sort((a, b) => {
        const getTime = (event) =>
          Number(String(event.date).match(/(\d{1,2}):(\d{2})/)?.[0].replace(':', '') || 0);
        return getTime(a) - getTime(b);
      });
    }

    return result;
  }, [events, searchQuery, quickFilter, filters, userCoords, selectedCity, sortBy]);

  const handleJoinEvent = async (event) => {
    if (!userId) {
      pushToast('Подождите, загружаем профиль…', 'info');
      return;
    }
    if (isEventOwner(event, userId) || joinedIds.includes(event.id)) return;
    if (pendingActions[event.id]) return;
    if (event.maxParticipants && event.participants >= event.maxParticipants) {
      pushToast('Мест больше нет', 'error');
      return;
    }

    setPendingActions((p) => ({ ...p, [event.id]: 'join' }));

    setJoinedIds((ids) => (ids.includes(event.id) ? ids : [...ids, event.id]));
    setParticipatedIds((ids) => (ids.includes(event.id) ? ids : [...ids, event.id]));
    setEvents((prev) =>
      prev.map((e) => (e.id === event.id ? { ...e, participants: e.participants + 1 } : e))
    );

    try {
      const userProfile = {
        name: user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Вы',
        photo_url: user?.photo_url,
        age: profile.age,
        city: profile.city || selectedCity?.name,
        about: profile.about,
      };
      const res = await joinEvent(event.id, userId, userProfile);

      maxBridge.haptic('medium');

      if (typeof res.participants === 'number') {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === event.id ? { ...e, participants: res.participants } : e
          )
        );
        setSelectedEvent((prev) =>
          prev?.id === event.id ? { ...prev, participants: res.participants } : prev
        );
      }
      track('join_success', { eventId: event.id });
      maxBridge.sendData({
        action: 'join_event',
        eventId: event.id,
        eventTitle: event.title,
        eventTime: event.eventTime || null,
      });
      pushToast(`Вы участвуете: «${event.title}»`);

      loadBootstrap(userId);
    } catch (e) {
      setJoinedIds((ids) => ids.filter((id) => id !== event.id));
      setParticipatedIds((ids) => ids.filter((id) => id !== event.id));
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === event.id
            ? { ...ev, participants: Math.max(0, ev.participants - 1) }
            : ev
        )
      );
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
    if (!userId) return;
    if (isEventOwner(event, userId) || !joinedIds.includes(event.id)) return;
    if (pendingActions[event.id]) return;

    setPendingActions((p) => ({ ...p, [event.id]: 'leave' }));

    setJoinedIds((ids) => ids.filter((id) => id !== event.id));
    setEvents((prev) =>
      prev.map((e) =>
        e.id === event.id ? { ...e, participants: Math.max(0, e.participants - 1) } : e
      )
    );

    try {
      const res = await leaveEvent(event.id, userId);
      if (typeof res.participants === 'number') {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === event.id ? { ...e, participants: res.participants } : e
          )
        );
        setSelectedEvent((prev) =>
          prev?.id === event.id ? { ...prev, participants: res.participants } : prev
        );
      }
      pushToast(`Вы отменили участие: «${event.title}»`);

      loadBootstrap(userId);
    } catch (e) {
      setJoinedIds((ids) => (ids.includes(event.id) ? ids : [...ids, event.id]));
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === event.id ? { ...ev, participants: ev.participants + 1 } : ev
        )
      );
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
    if (!userId) {
      pushToast('Подождите, загружаем профиль…', 'info');
      throw new Error('Профиль ещё не загружен');
    }
    try {
      if (editingId) {
        const updated = await updateEvent(editingId, newEvent, userId);
        setEvents((prev) => prev.map((e) => (e.id === editingId ? updated : e)));
        setSelectedEvent((prev) => (prev?.id === editingId ? updated : prev));
        setEditingEvent(null);
        setActiveTab('my');
        pushToast(`Событие «${updated.title}» обновлено`);
        loadBootstrap(userId);
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
      loadBootstrap(userId);
    } catch (error) {
      pushToast(error.message || 'Не удалось сохранить событие', 'error');
      throw error;
    }
  };

  const handleEditEvent = (event) => {
    if (!isEventOwner(event, userId)) return;
    if (getEventStatus(event) === 'past') {
      pushToast('Завершённое событие нельзя редактировать', 'error');
      return;
    }
    setEditingEvent(event);
    setSelectedEvent(null);
    setActiveTab('create');
  };

  const handleEventClick = (event) => {
    track('event_opened', { eventId: event.id });
    setSelectedOrganizer(null);
    setSelectedEvent(event);
  };

  const handleOpenOrganizer = async (organizer) => {
    if (!organizer?.id) return;
    track('organizer_opened', { organizerId: organizer.id });
    setSelectedEvent(null);
    setSelectedOrganizer(organizer);
    try {
      const fresh = await fetchUser(organizer.id);
      if (fresh) setSelectedOrganizer(fresh);
    } catch (e) {
      console.warn('Не удалось загрузить профиль организатора', e);
    }
  };

  const handleOpenParticipants = async (event) => {
    setParticipantsEvent(event);
    setLoadingParticipants(true);
    setParticipantProfiles([]);
    try {
      const list = await fetchParticipants(event.id);
      setParticipantProfiles(list);
    } catch (e) {
      console.warn('Не удалось загрузить участников', e);
      setParticipantProfiles([]);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleOpenParticipantProfile = async (person) => {
    setParticipantsEvent(null);
    setSelectedPerson(person);
    try {
      const fresh = await fetchUser(person.id);
      if (fresh) setSelectedPerson(fresh);
    } catch (e) {
      console.warn('Не удалось загрузить профиль участника', e);
    }
  };

  const handleSaveProfile = async (nextProfile) => {
    if (!userId) return;
    const age = Number(nextProfile.age);
    const sanitized = {
      age: Number.isInteger(age) && age >= 14 && age <= 120 ? age : null,
      city: String(nextProfile.city || '').trim().slice(0, 80),
      about: String(nextProfile.about || '').trim().slice(0, 500),
      name: user?.first_name
        ? `${user.first_name} ${user.last_name || ''}`.trim()
        : undefined,
      photo_url: user?.photo_url || undefined,
    };

    setProfile(sanitized);
    storage.setProfile(userId, sanitized);

    try {
      const updated = await updateUser(userId, sanitized);

      setEvents((prev) =>
        prev.map((event) => {
          const eventOrgId = event.organizerId ?? event.organizer?.id;
          if (String(eventOrgId) !== String(userId)) return event;
          return { ...event, organizer: { ...event.organizer, ...updated } };
        })
      );

      setSelectedEvent((prev) => {
        if (!prev) return prev;
        const eventOrgId = prev.organizerId ?? prev.organizer?.id;
        if (String(eventOrgId) !== String(userId)) return prev;
        return { ...prev, organizer: { ...prev.organizer, ...updated } };
      });

      pushToast('Профиль сохранён');
    } catch (e) {
      console.warn('Не удалось синхронизировать профиль', e);
      pushToast('Профиль сохранён локально, но не синхронизирован', 'error');
    }
  };

  const handleApplyFilters = (f) => {
    setFilters(f);
    setQuickFilter(null);
  };

  const handleOpenChat = (event) => {
    track('chat_opened', { eventId: event.id });
    const chatUrl = String(event.maxChatUrl || '').trim();
    if (/^https:\/\//i.test(chatUrl)) window.open(chatUrl, '_blank', 'noopener,noreferrer');
    else pushToast('Организатор пока не добавил ссылку на чат', 'info');
  };

  const handleCitySelect = (city) => {
    setSelectedCity(city);
    setIsCityOpen(false);
    setQuickFilter(null);
    setFilters(null);
  };

  const handleAddReview = async (review) => {
    const created = await addReview(review);
    setReviewsByEvent((prev) => ({
      ...prev,
      [review.eventId]: [created, ...(prev[review.eventId] || [])],
    }));
    pushToast('Спасибо за отзыв!');
    return created;
  };

  const isExploreTab = activeTab === 'feed' || activeTab === 'map';

  // ★ Пока userId не пришёл — показываем скелетон, а не кнопки
  const isReady = Boolean(userId);

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
                    <span className="pin">
                      <Icon name="pin" size={17} filled />
                    </span>
                    {selectedCity?.name || 'Город'}
                    <span className="chevron">
                      <Icon name="chevronDown" size={14} />
                    </span>
                  </button>
                </h1>
                <button
                  className={`header-more ${isMenuOpen ? 'active' : ''}`}
                  type="button"
                  onClick={() => setIsMenuOpen((value) => !value)}
                  aria-label="Открыть меню"
                  aria-expanded={isMenuOpen}
                >
                  <Icon name="more" size={23} />
                </button>
              </div>
              {isMenuOpen && (
                <div className="header-menu">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('my');
                      setIsMenuOpen(false);
                    }}
                  >
                    <Icon name="calendar" size={19} />
                    Мои события
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('profile');
                      setIsMenuOpen(false);
                    }}
                  >
                    <Icon name="user" size={19} />
                    Профиль
                  </button>
                </div>
              )}
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
                <span className="tab-icon">
                  <Icon name="calendar" size={21} />
                </span>{' '}
                Лента
              </button>
              <button
                className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
                onClick={() => setActiveTab('map')}
              >
                <span className="tab-icon">
                  <Icon name="map" size={21} />
                </span>{' '}
                Карта
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
          {loading || !isReady ? (
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
                  activeFiltersCount={activeFiltersCount}
                  onResetFilters={() => {
                    setFilters(null);
                    setQuickFilter(null);
                  }}
                  onCreate={() => {
                    track('create_started', { source: 'empty_feed' });
                    setEditingEvent(null);
                    setActiveTab('create');
                  }}
                />
              )}
              {activeTab === 'favorites' && (
                <>
                  <h2 className="favorites-title">Избранное</h2>
                  <EventFeed
                    userId={userId}
                    onDelete={requestDelete}
                    events={events.filter((event) => likedIds.includes(event.id))}
                    onJoin={handleJoinEvent}
                    onLeave={handleLeaveEvent}
                    onEventClick={handleEventClick}
                    joinedIds={joinedIds}
                    likedIds={likedIds}
                    onToggleLike={handleToggleLike}
                    pendingActions={pendingActions}
                    onCreate={() => {
                      setEditingEvent(null);
                      setActiveTab('create');
                    }}
                  />
                </>
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
                  city={selectedCity?.name || 'Казань'}
                  cityCoords={selectedCity ? [selectedCity.lat, selectedCity.lng] : null}
                  userCoords={userCoords}
                />
              )}

              {activeTab === 'create' && (
                <CreateEventForm
                  onCreate={handleCreateEvent}
                  onCancel={() => {
                    setEditingEvent(null);
                    setActiveTab('feed');
                  }}
                  userId={userId || ''}
                  userName={user?.first_name || user?.name}
                  userPhotoUrl={user?.photo_url}
                  userAge={profile.age}
                  userCity={profile.city || selectedCity?.name}
                  userAbout={profile.about}
                  city={selectedCity?.name || 'Казань'}
                  cityCoords={
                    selectedCity ? { lat: selectedCity.lat, lng: selectedCity.lng } : null
                  }
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
                  participatedIds={participatedIds}
                  likedIds={likedIds}
                  onToggleLike={handleToggleLike}
                  userId={userId || ''}
                  showCreatedInitially={Boolean(lastCreatedEventId)}
                />
              )}

              {activeTab === 'profile' && (
                <Profile
                  user={user}
                  profile={profile}
                  onSaveProfile={handleSaveProfile}
                  joinedIds={joinedIds}
                  participatedIds={participatedIds}
                  createdCount={createdIds.length}
                  notificationsOn={notificationsOn}
                  onToggleNotifications={handleToggleNotifications}
                  theme={theme}
                  onToggleTheme={handleToggleTheme}
                />
              )}
            </>
          )}
        </div>

        {!selectedEvent && (
          <div className="bottom-nav">
            <button
              onClick={() => setActiveTab('feed')}
              className={activeTab === 'feed' ? 'active' : ''}
            >
              <span className="icon">
                <Icon name="home" size={23} filled />
              </span>
              <span>Главная</span>
            </button>
            <button
              onClick={() => {
                setEditingEvent(null);
                setActiveTab('create');
              }}
              onClickCapture={() => track('create_started', { source: 'navigation' })}
              className={`create-btn ${activeTab === 'create' ? 'active' : ''}`}
            >
              <span className="icon-plus">
                <Icon name="plus" size={34} />
              </span>
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={activeTab === 'my' ? 'active' : ''}
            >
              <span className="icon">
                <Icon name="user" size={23} />
              </span>
              <span>Мои события</span>
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={activeTab === 'favorites' ? 'active' : ''}
            >
              <span className="icon">
                <Icon name="heart" size={23} />
              </span>
              <span>Избранное</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={activeTab === 'profile' ? 'active' : ''}
            >
              <span className="icon">
                <Icon name="user" size={23} />
              </span>
              <span>Профиль</span>
            </button>
          </div>
        )}
      </div>

      {isFiltersOpen && (
        <FiltersModal
          onClose={() => setIsFiltersOpen(false)}
          onApply={handleApplyFilters}
          initialFilters={filters}
          sortBy={sortBy}
          onSortChange={setSortBy}
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
          onOpenParticipants={handleOpenParticipants}
          isJoined={joinedIds.includes(selectedEvent.id)}
          isLiked={likedIds.includes(selectedEvent.id)}
          onToggleLike={handleToggleLike}
          userId={userId || ''}
          userName={user?.first_name || user?.name}
          reviews={reviewsByEvent[selectedEvent.id] || []}
          onAddReview={handleAddReview}
          wasParticipant={participatedIds.includes(selectedEvent.id)}
          relatedEvents={filteredEvents
            .filter((e) => e.id !== selectedEvent.id && e.category === selectedEvent.category)
            .slice(0, 3)}
          onRelatedClick={handleEventClick}
          onShare={(ev) => {
            const link = `https://max.ru/${BOT_USERNAME}?startapp=event_${ev.id}`;
            maxBridge.shareContent({ text: `${ev.title}\n${ev.date}`, link });
          }}
        />
      )}

      {selectedOrganizer && (
        <OrganizerProfileModal
          organizer={selectedOrganizer}
          events={events.filter((e) => {
            const eventOrgId = e.organizerId ?? e.organizer?.id;
            return String(eventOrgId) === String(selectedOrganizer.id);
          })}
          reviews={Object.values(reviewsByEvent).flat()}
          onClose={() => setSelectedOrganizer(null)}
          onEventClick={handleEventClick}
        />
      )}

      {participantsEvent && (
        <ParticipantsModal
          event={participantsEvent}
          participants={participantProfiles}
          loading={loadingParticipants}
          onClose={() => setParticipantsEvent(null)}
          onOpenProfile={handleOpenParticipantProfile}
        />
      )}

      {selectedPerson && (
        <UserProfileModal
          person={selectedPerson}
          events={events}
          reviews={Object.values(reviewsByEvent).flat()}
          onClose={() => setSelectedPerson(null)}
          onEventClick={(event) => {
            setSelectedPerson(null);
            handleEventClick(event);
          }}
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
            <span>{t.variant === 'error' ? '⚠' : t.variant === 'info' ? 'ℹ' : '✓'}</span>{' '}
            {t.text}
          </button>
        ))}
      </div>

      <CityPickerModal
        isOpen={isCityOpen}
        currentCity={selectedCity}
        onSelect={handleCitySelect}
        onClose={() => setIsCityOpen(false)}
      />
    </div>
  );
}

export default App;