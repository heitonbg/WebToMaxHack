import React from 'react';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import Icon from './Icon';

export default function EventLocationMap({ event }) {
  if (event.format === 'Онлайн' || event.district === 'Онлайн') return null;
  if (!Number.isFinite(event.lat) || !Number.isFinite(event.lng)) {
    return <p className="event-location-unavailable">Место на карте не указано</p>;
  }
  const position = [event.lat, event.lng];
  const isApple = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const url = isApple ? `https://maps.apple.com/?daddr=${event.lat},${event.lng}` : `https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}`;
  return <div className="event-location-map">
    <MapContainer key={`${event.id}-${position.join(',')}`} center={position} zoom={15} zoomControl={false} scrollWheelZoom={false} dragging={false} touchZoom={false} doubleClickZoom={false} keyboard={false}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <CircleMarker center={position} radius={10} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2685ff', fillOpacity: 1 }} />
    </MapContainer>
    <a href={url} target="_blank" rel="noopener noreferrer"><Icon name="compass" size={17} />Открыть в картах</a>
  </div>;
}
