import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Icon from './Icon';
import EventCard from './EventCard';
import { isEventOwner } from '../utils/eventOwnership';

const markerColor = {
  'Настольные игры': 'blue', Спорт: 'green', Культура: 'pink',
  Кино: 'orange', Музыка: 'violet', Прогулка: 'blue'
};

const cityCenters = {
  'Казань': [55.796, 49.108],
  'Москва': [55.7558, 37.6176],
  'Санкт-Петербург': [59.9343, 30.3351]
};

const categorySvg = {
  'Настольные игры': '<svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="3"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/></svg>',
  'Спорт': '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><path d="m7 8 10 8M8 17l8-10M5 12h14"/></svg>',
  'Культура': '<svg viewBox="0 0 24 24"><path d="m4 9 8-5 8 5M6 10v7M10 10v7M14 10v7M18 10v7M4 20h16"/></svg>',
  'Кино': '<svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="13" rx="2"/><path d="m10 10 5 3-5 3Z"/></svg>',
  'Музыка': '<svg viewBox="0 0 24 24"><path d="M9 17V6l10-2v11M9 17a3 3 0 1 1-3-3h3M19 15a3 3 0 1 1-3-3h3"/></svg>',
  'Прогулка': '<svg viewBox="0 0 24 24"><circle cx="13" cy="5" r="2"/><path d="m11 9 3 3 3 1M11 9 8 13M14 12l-1 7M10 14l-3 5"/></svg>'
};

function MapEffects({ onMapReady }) {
  const map = useMap();
  useEffect(() => { onMapReady?.(map); }, [map, onMapReady]);
  return null;
}

const EventMap = ({
  events, onJoin, onLeave, onDelete, userId, onEventClick,
  joinedIds = [], likedIds = [], onToggleLike, city = 'Казань', userCoords
}) => {
  const [activeEvent, setActiveEvent] = useState(events[0] || null);
  const mapRef = useRef(null);

  useEffect(() => {
    const updated = events.find((event) => event.id === activeEvent?.id);
    setActiveEvent(updated || events[0] || null);
  }, [events, activeEvent?.id]);

  const geoEvents = events.filter((event) => event.lat && event.lng);

  const icons = useMemo(() => Object.fromEntries(geoEvents.map((event) => [event.id, L.divIcon({
    className: 'event-map-marker-wrap',
    html: `<div class="event-map-marker ${markerColor[event.category] || 'blue'}">
      <span class="marker-symbol">${categorySvg[event.category] || categorySvg['Прогулка']}</span>
      <span><b>${event.category}</b><small>${event.participants} участников</small></span>
    </div>`,
    iconSize: [150, 54],
    iconAnchor: [26, 51]
  })])), [geoEvents]);

  const handleLocate = () => {
    if (!mapRef.current) return;
    if (userCoords) mapRef.current.flyTo([userCoords.lat, userCoords.lng], 14, { duration: 0.8 });
  };

  return (
    <div className="map-container map-screen">
      <MapContainer key={city} center={cityCenters[city] || cityCenters['Казань']} zoom={12} zoomControl={false} scrollWheelZoom>
        <MapEffects onMapReady={(m) => { mapRef.current = m; }} />
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
          {geoEvents.map((event) => (
            <Marker
              key={event.id}
              position={[event.lat, event.lng]}
              icon={icons[event.id]}
              eventHandlers={{ click: () => setActiveEvent(event) }}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>
      <button className="map-float-button compass-button" aria-label="Моё местоположение" onClick={handleLocate}>
        <Icon name="compass" size={24} />
      </button>
      {activeEvent && (
        <div className="map-event-preview">
          <div className="map-sheet-handle" />
          <EventCard
            event={activeEvent}
            isOwner={isEventOwner(activeEvent, userId)}
            onDelete={onDelete}
            onJoin={onJoin}
            onLeave={onLeave}
            onClick={onEventClick}
            isJoined={joinedIds.includes(activeEvent.id)}
            isLiked={likedIds.includes(activeEvent.id)}
            onToggleLike={onToggleLike}
          />
        </div>
      )}
    </div>
  );
};

export default EventMap;