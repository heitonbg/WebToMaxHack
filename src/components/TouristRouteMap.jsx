import React, { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { fetchFootRoute } from '../utils/roadRoute';

function FitRoute({ points }) {
  const map = useMap();
  const positions = useMemo(() => points.map((point) => [point.lat, point.lng]), [points]);
  useEffect(() => {
    if (positions.length > 1) map.fitBounds(positions, { padding: [24, 24] });
    else if (positions.length === 1) map.setView(positions[0], 14);
  }, [map, positions]);
  return null;
}

function MapPointPicker({ enabled, onSelect }) {
  useMapEvents({
    click: (event) => {
      if (enabled) onSelect?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

function FocusSelectedPoint({ point }) {
  const map = useMap();
  useEffect(() => {
    if (point?.lat != null && point?.lng != null) {
      map.setView([Number(point.lat), Number(point.lng)], Math.max(map.getZoom(), 15));
    }
  }, [map, point?.lat, point?.lng]);
  return null;
}

const TouristRouteMap = ({ stops, interactive = false, selectedPoint = null, onPointSelect, initialCenter = [55.796, 49.108] }) => {
  const pointsKey = stops.map((stop) => `${stop.id}:${stop.lat},${stop.lng}`).join('|');
  const points = useMemo(() => stops.filter((stop) =>
    stop.lat != null && stop.lng != null &&
    Number.isFinite(Number(stop.lat)) && Number.isFinite(Number(stop.lng))
  ), [pointsKey]);
  const [roadRoute, setRoadRoute] = useState(null);
  const [roadRouteError, setRoadRouteError] = useState('');
  useEffect(() => {
    if (points.length < 2) {
      setRoadRoute(null);
      setRoadRouteError('');
      return undefined;
    }
    const controller = new AbortController();
    setRoadRoute(null);
    setRoadRouteError('');
    fetchFootRoute(points, { signal: controller.signal })
      .then(setRoadRoute)
      .catch((error) => {
        if (!controller.signal.aborted) setRoadRouteError(error.message || 'Не удалось построить пеший маршрут');
      });
    return () => controller.abort();
  }, [pointsKey]);
  if (!points.length && !interactive) return null;

  const positions = points.map((point) => [Number(point.lat), Number(point.lng)]);
  const center = selectedPoint
    ? [Number(selectedPoint.lat), Number(selectedPoint.lng)]
    : positions[0] || initialCenter;
  return (
    <div className={`tourist-route-map ${interactive ? 'is-picking' : ''}`} aria-label={interactive ? 'Выбор точки остановки на карте' : 'Карта маршрута'}>
      <MapContainer
        key={`${pointsKey}:${interactive}`}
        center={center}
        zoom={13}
        scrollWheelZoom={interactive}
        zoomControl
      >
        <MapPointPicker enabled={interactive} onSelect={onPointSelect} />
        <FocusSelectedPoint point={selectedPoint} />
        <FitRoute points={points} />
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {roadRoute?.coordinates?.length > 1 && <Polyline positions={roadRoute.coordinates} pathOptions={{ color: '#177a56', weight: 4, opacity: 0.82 }} />}
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
        {selectedPoint && (
          <CircleMarker
            center={[Number(selectedPoint.lat), Number(selectedPoint.lng)]}
            radius={10}
            pathOptions={{ color: '#fff', fillColor: '#2786f8', fillOpacity: 1, weight: 3 }}
          >
            <Popup>Новая остановка</Popup>
          </CircleMarker>
        )}
      </MapContainer>
      {points.length > 1 && (
        <p className="tourist-route-map-status" role="status">
          {roadRoute
            ? `Пешком ${(roadRoute.distanceMeters / 1000).toFixed(1)} км · около ${Math.round(roadRoute.durationSeconds / 60)} мин · OpenStreetMap`
            : roadRouteError || 'Строим пеший маршрут по дорогам…'}
        </p>
      )}
    </div>
  );
};

export default TouristRouteMap;
