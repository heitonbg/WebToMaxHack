import React, { useEffect } from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';

function FitRoute({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points.map((point) => [point.lat, point.lng]), { padding: [24, 24] });
    else if (points.length === 1) map.setView([points[0].lat, points[0].lng], 14);
  }, [map, points]);
  return null;
}

const TouristRouteMap = ({ stops }) => {
  const points = stops.filter((stop) =>
    stop.lat != null && stop.lng != null &&
    Number.isFinite(Number(stop.lat)) && Number.isFinite(Number(stop.lng))
  );
  if (!points.length) return null;

  const positions = points.map((point) => [Number(point.lat), Number(point.lng)]);
  return (
    <div className="tourist-route-map" aria-label="Карта маршрута">
      <MapContainer
        key={points.map((point) => `${point.id}:${point.lat},${point.lng}`).join('|')}
        center={positions[0]}
        zoom={13}
        scrollWheelZoom={false}
        zoomControl
      >
        <FitRoute points={points} />
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {positions.length > 1 && <Polyline positions={positions} pathOptions={{ color: '#177a56', weight: 4, opacity: 0.78 }} />}
        {points.map((point, index) => {
          const isPlace = point.kind === 'restaurant' || point.kind === 'attraction';
          return (
            <CircleMarker
              key={`${point.id || point.eventId}-${index}`}
              center={[Number(point.lat), Number(point.lng)]}
              radius={isPlace ? 6 : 8}
              pathOptions={{
                color: isPlace ? '#b26b16' : '#177a56',
                fillColor: isPlace ? '#f3b85c' : '#43a779',
                fillOpacity: 1,
                weight: 2,
              }}
            >
              <Popup>{point.name || point.title}</Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default TouristRouteMap;
