import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  Tooltip,
  useMap,
} from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Icon from './Icon';
import EventCard from './EventCard';
import { isEventOwner } from '../utils/eventOwnership';
import { isOnlineEvent } from '../utils/eventFilters';
import { getTouristRouteStops, isTouristPlace } from '../utils/touristMapLinks';
import { fetchFootRoute } from '../utils/roadRoute';

const markerColor = {
  'Настольные игры': 'blue',
  Спорт: 'green',
  Культура: 'pink',
  Кино: 'orange',
  Музыка: 'violet',
  Прогулка: 'blue',
};

const DEFAULT_CENTER = [55.796, 49.108];
const TIME_FILTERS = [
  { id: 'all', label: 'Все даты' },
  { id: 'now', label: 'Свободен сейчас' },
  { id: 'today', label: 'Сегодня' },
  { id: 'tomorrow', label: 'Завтра' },
  { id: 'week', label: '7 дней' },
  { id: 'month', label: '30 дней' },
];

const categorySvg = {
  'Настольные игры':
    '<svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="3"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/></svg>',
  Спорт:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><path d="m7 8 10 8M8 17l8-10M5 12h14"/></svg>',
  Культура:
    '<svg viewBox="0 0 24 24"><path d="m4 9 8-5 8 5M6 10v7M10 10v7M14 10v7M18 10v7M4 20h16"/></svg>',
  Кино:
    '<svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="13" rx="2"/><path d="m10 10 5 3-5 3Z"/></svg>',
  Музыка:
    '<svg viewBox="0 0 24 24"><path d="M9 17V6l10-2v11M9 17a3 3 0 1 1-3-3h3M19 15a3 3 0 1 1-3-3h3"/></svg>',
  Прогулка:
    '<svg viewBox="0 0 24 24"><circle cx="13" cy="5" r="2"/><path d="m11 9 3 3 3 1M11 9 8 13M14 12l-1 7M10 14l-3 5"/></svg>',
};

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// ★ Один круглый слот — фото или буква.
const renderFriendAvatar = (friend) => {
  const rawName = String(friend?.name || '').trim();
  const safeName = escapeHtml(rawName || 'Друг');
  const initial = escapeHtml((rawName || 'Д').slice(0, 1).toUpperCase());
  const photoUrl =
    typeof friend?.photo_url === 'string' ? friend.photo_url.trim() : '';

  if (photoUrl) {
    return `<span class="marker-friend" title="${safeName}">
      <img src="${escapeHtml(photoUrl)}" alt="" onerror="this.style.display='none'; this.parentElement.classList.add('marker-friend--fallback');"/>
      <span class="marker-friend-initial">${initial}</span>
    </span>`;
  }

  return `<span class="marker-friend marker-friend--fallback" title="${safeName}">
    <span class="marker-friend-initial">${initial}</span>
  </span>`;
};

// ★ Левый символ маркера:
//   - если на событии есть друзья — ОДНА аватарка активного друга,
//   - если нет — иконка категории.
const buildMarkerSymbolHtml = (friend, categorySvgHtml) => {
  if (!friend) {
    return `<span class="marker-symbol">${categorySvgHtml}</span>`;
  }
  return `<span class="marker-symbol marker-symbol--friends">${renderFriendAvatar(friend)}</span>`;
};

// ★ Хук: возвращает индекс активного друга для каждого события и обновляет его каждые 7 сек.
//   Работает только когда есть события с 2+ друзьями — не тратит ресурсы впустую.
function useFriendRotation(geoEvents, intervalMs = 7000) {
  const [tick, setTick] = useState(0);
  const hasMultiFriends = useMemo(
    () =>
      geoEvents.some(
        (event) => Array.isArray(event.friendGoers) && event.friendGoers.length > 1
      ),
    [geoEvents]
  );

  useEffect(() => {
    if (!hasMultiFriends) return undefined;
    const timer = window.setInterval(() => {
      setTick((value) => value + 1);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [hasMultiFriends, intervalMs]);

  return tick;
}

function MapEffects({ onMapReady }) {
  const map = useMap();
  useEffect(() => {
    onMapReady?.(map);
  }, [map, onMapReady]);
  return null;
}

function TouristRouteOverlay({ active, stops, onStatus, onEventClick }) {
  const map = useMap();
  const previousViewRef = useRef(null);
  const [roadRoute, setRoadRoute] = useState(null);
  const [routeError, setRouteError] = useState('');

  const points = stops.filter((stop) => {
    if (isOnlineEvent(stop)) return false;
    return (
      stop.lat != null &&
      stop.lng != null &&
      Number.isFinite(Number(stop.lat)) &&
      Number.isFinite(Number(stop.lng))
    );
  });
  const routeSignature = points
    .map((point) => `${point.id}:${point.lat},${point.lng}`)
    .join('|');

  useEffect(() => {
    if (!active || points.length < 2) {
      setRoadRoute(null);
      setRouteError('');
      onStatus?.({ loading: false, error: '' });
      return undefined;
    }

    const controller = new AbortController();
    setRoadRoute(null);
    setRouteError('');
    onStatus?.({ loading: true, error: '' });
    fetchFootRoute(points, { signal: controller.signal })
      .then((route) => {
        if (controller.signal.aborted) return;
        setRoadRoute(route);
        onStatus?.({
          loading: false,
          error: '',
          distanceMeters: route?.distanceMeters,
          durationSeconds: route?.durationSeconds,
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setRouteError(error.message || 'Не удалось построить пеший маршрут');
        onStatus?.({
          loading: false,
          error: error.message || 'Не удалось построить пеший маршрут',
        });
      });

    return () => controller.abort();
  }, [active, routeSignature, onStatus]);

  useEffect(() => {
    if (active && points.length) {
      if (!previousViewRef.current) {
        previousViewRef.current = {
          center: map.getCenter(),
          zoom: map.getZoom(),
        };
      }
      const positions =
        roadRoute?.coordinates ||
        points.map((point) => [Number(point.lat), Number(point.lng)]);
      if (positions.length > 1)
        map.fitBounds(positions, { padding: [48, 48], maxZoom: 14 });
      else map.setView(positions[0], 14);
      return;
    }

    if (previousViewRef.current) {
      map.setView(previousViewRef.current.center, previousViewRef.current.zoom);
      previousViewRef.current = null;
    }
  }, [active, map, routeSignature, roadRoute]);

  if (!active || !points.length) return null;
  const positions = points.map((point) => [
    Number(point.lat),
    Number(point.lng),
  ]);

  return (
    <>
      {roadRoute?.coordinates?.length > 1 && (
        <Polyline
          positions={roadRoute.coordinates}
          pathOptions={{ color: '#177a56', weight: 5, opacity: 0.9 }}
        />
      )}
      {points.map((point, index) => {
        const isPlace = isTouristPlace(point);
        return (
          <CircleMarker
            key={`${point.id || point.eventId}-${index}`}
            center={positions[index]}
            radius={11}
            pathOptions={{
              color: '#fff',
              fillColor: isPlace ? '#c07820' : '#177a56',
              fillOpacity: 1,
              weight: 3,
            }}
            eventHandlers={
              !isPlace ? { click: () => onEventClick?.(point) } : undefined
            }
          >
            <Tooltip
              permanent
              direction="top"
              offset={[0, -8]}
              className="tourist-route-stop-number"
            >
              {index + 1}
            </Tooltip>
            {isPlace && (
              <Popup>{`${index + 1}. ${point.name || point.title}`}</Popup>
            )}
          </CircleMarker>
        );
      })}
    </>
  );
}

const EventMap = ({
  events,
  timeFilter = 'all',
  onTimeFilterChange,
  touristRoute,
  onCloseTouristRoute,
  onJoin,
  onLeave,
  onLeaveRequest,
  onDelete,
  userId,
  onEventClick,
  joinedIds = [],
  likedIds = [],
  onToggleLike,
  city = 'Казань',
  cityCoords,
  userCoords,
  showUserMarker = false,
}) => {
  const [activeEvent, setActiveEvent] = useState(null);
  const [touristRoadStatus, setTouristRoadStatus] = useState({
    loading: false,
    error: '',
  });
  const mapRef = useRef(null);

  const geoEvents = events.filter((event) => {
    if (isOnlineEvent(event)) return false;
    return (
      event.lat != null &&
      event.lng != null &&
      Number.isFinite(Number(event.lat)) &&
      Number.isFinite(Number(event.lng))
    );
  });

  // ★ Общий "тик" для ротации друзей. Меняется каждые 7 секунд.
  const rotationTick = useFriendRotation(geoEvents);

  const icons = useMemo(
    () =>
      Object.fromEntries(
        geoEvents.map((event) => {
          const friends = Array.isArray(event.friendGoers)
            ? event.friendGoers.filter(Boolean)
            : [];
          const activeFriend = friends.length
            ? friends[rotationTick % friends.length]
            : null;

          const symbolHtml = buildMarkerSymbolHtml(
            activeFriend,
            categorySvg[event.category] || categorySvg['Прогулка']
          );
          const participantLabel = `${event.participants} участников`;
          const hasFriends = friends.length > 0;
          const friendsLabel = hasFriends
            ? `<small class="event-map-marker-friends-label">Друг идёт${
                friends.length > 1 ? ` · ${friends.length}` : ''
              }</small>`
            : '';
          return [
            event.id,
            L.divIcon({
              className: 'event-map-marker-wrap',
              html: `<div class="event-map-marker ${
                markerColor[event.category] || 'blue'
              }${hasFriends ? ' event-map-marker--has-friends' : ''}">
                ${symbolHtml}
                <span>
                  <b>${escapeHtml(event.category)}</b>
                  <small>${escapeHtml(participantLabel)}</small>
                  ${friendsLabel}
                </span>
              </div>`,
              iconSize: [190, 60],
              iconAnchor: [26, 56],
            }),
          ];
        })
      ),
    [geoEvents, rotationTick]
  );

  const handleLocate = () => {
    if (!mapRef.current) return;
    if (userCoords)
      mapRef.current.flyTo([userCoords.lat, userCoords.lng], 14, {
        duration: 0.8,
      });
  };

  const center = cityCoords || DEFAULT_CENTER;
  const touristOption =
    touristRoute?.options?.find(
      (option) => option.id === touristRoute.selectedOptionId
    ) || touristRoute?.options?.[0];
  const touristRouteStops = touristOption
    ? getTouristRouteStops(touristOption)
    : [];

  const touristRoutePoints = touristRouteStops.filter((stop) => {
    if (isOnlineEvent(stop)) return false;
    return (
      stop.lat != null &&
      stop.lng != null &&
      Number.isFinite(Number(stop.lat)) &&
      Number.isFinite(Number(stop.lng))
    );
  });

  const touristEventIds = new Set(
    touristRouteStops
      .filter((stop) => !isTouristPlace(stop) && !isOnlineEvent(stop))
      .map((event) => String(event.id))
  );

  const isTouristRouteVisible = Boolean(
    touristRoute && touristRoutePoints.length
  );

  useEffect(() => {
    if (!activeEvent) return;
    const updated = isTouristRouteVisible
      ? touristRouteStops.find(
          (event) =>
            !isTouristPlace(event) &&
            String(event.id) === String(activeEvent.id)
        )
      : events.find((event) => String(event.id) === String(activeEvent.id));
    if (!updated || isOnlineEvent(updated)) {
      setActiveEvent(null);
      return;
    }
    if (updated !== activeEvent) setActiveEvent(updated);
  }, [activeEvent, events, isTouristRouteVisible, touristOption]);

  const hasUserMarker =
    showUserMarker &&
    userCoords?.lat != null &&
    userCoords?.lng != null &&
    Number.isFinite(Number(userCoords.lat)) &&
    Number.isFinite(Number(userCoords.lng));

  return (
    <div className="map-container map-screen">
      <MapContainer
        key={city}
        center={center}
        zoom={10}
        zoomControl={false}
        scrollWheelZoom
        minZoom={3}
        worldCopyJump
      >
        <MapEffects
          onMapReady={(m) => {
            mapRef.current = m;
          }}
        />
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <TouristRouteOverlay
          active={isTouristRouteVisible}
          stops={touristRouteStops}
          onStatus={setTouristRoadStatus}
          onEventClick={setActiveEvent}
        />

        {hasUserMarker && (
          <CircleMarker
            center={[Number(userCoords.lat), Number(userCoords.lng)]}
            radius={9}
            pathOptions={{
              color: '#fff',
              weight: 3,
              fillColor: '#2786f8',
              fillOpacity: 1,
            }}
          >
            <Popup>Вы здесь</Popup>
          </CircleMarker>
        )}

        {!isTouristRouteVisible && (
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={80}
            showCoverageOnHover={false}
            spiderfyOnMaxZoom
            disableClusteringAtZoom={13}
          >
            {geoEvents.map((event) => (
              <Marker
                key={`${event.id}-${
                  Array.isArray(event.friendGoers) && event.friendGoers.length > 1
                    ? rotationTick % event.friendGoers.length
                    : 0
                }`}
                position={[event.lat, event.lng]}
                icon={icons[event.id]}
                eventHandlers={{ click: () => setActiveEvent(event) }}
              />
            ))}
          </MarkerClusterGroup>
        )}
      </MapContainer>

      <div
        className="map-time-filters"
        role="group"
        aria-label="Фильтр событий по времени"
      >
        {TIME_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={timeFilter === filter.id ? 'active' : ''}
            aria-pressed={timeFilter === filter.id}
            onClick={() => onTimeFilterChange?.(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <button
        className="map-float-button compass-button"
        aria-label="Моё местоположение"
        onClick={handleLocate}
        disabled={!userCoords}
      >
        <Icon name="compass" size={24} />
      </button>

      {isTouristRouteVisible && (
        <div className="map-tourist-mode-plaque" role="status">
          <span className="map-tourist-mode-icon">
            <Icon name="compass" size={19} />
          </span>
          <span className="map-tourist-mode-copy">
            <strong>Туристический режим</strong>
            <small>
              {touristRoute.city || 'Маршрут'} · Остановок:{' '}
              {touristRoutePoints.length}
            </small>
            <small>
              {touristRoadStatus.loading
                ? 'Строим пеший маршрут по дорогам…'
                : touristRoadStatus.error
                  ? 'Пеший путь не найден. Точки маршрута сохранены.'
                  : touristRoadStatus.distanceMeters
                    ? `${(touristRoadStatus.distanceMeters / 1000).toFixed(
                        1
                      )} км · около ${Math.round(
                        touristRoadStatus.durationSeconds / 60
                      )} мин пешком`
                    : ''}
            </small>
          </span>
          <button
            type="button"
            className="map-tourist-mode-close"
            aria-label="Закрыть туристический маршрут"
            title="Скрыть маршрут"
            onClick={onCloseTouristRoute}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      )}

      {activeEvent &&
        !isOnlineEvent(activeEvent) &&
        (!isTouristRouteVisible ||
          touristEventIds.has(String(activeEvent.id))) && (
          <div className="map-event-preview">
            <EventCard
              event={activeEvent}
              isOwner={isEventOwner(activeEvent, userId)}
              onDelete={onDelete}
              onJoin={onJoin}
              onLeave={onLeave}
              onLeaveRequest={onLeaveRequest}
              onClick={onEventClick}
              isJoined={joinedIds.includes(activeEvent.id)}
              isLiked={likedIds.includes(activeEvent.id)}
              onToggleLike={onToggleLike}
              onClosePreview={() => setActiveEvent(null)}
            />
          </div>
        )}
    </div>
  );
};

export default EventMap;