import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { moderateContent, moderateUrl } from '../utils/contentModeration';
import { uploadImages, reverseGeocode, geocodeTouristAddress } from '../api/events';
import { findNearestCity } from '../utils/citySearch';
import Icon from './Icon';
import { getDefaultEventImage } from '../utils/defaultEventImages';

const CATEGORIES = ['Настольные игры', 'Спорт', 'Культура', 'Кино', 'Прогулка', 'Музыка', 'Волонтёрство', 'Другое'];

const CITY_CENTERS = {
  'Казань': { lat: 55.796, lng: 49.108 },
  'Москва': { lat: 55.7558, lng: 37.6176 },
  'Санкт-Петербург': { lat: 59.9343, lng: 30.3351 }
};
const DEFAULT_CENTER = { lat: 55.796, lng: 49.108 };

const pickerPin = L.divIcon({
  className: 'picker-pin-wrap',
  html: '<div class="picker-pin-dot"></div>',
  iconSize: [28, 38],
  iconAnchor: [14, 38]
});

function PointSelector({ point, onSelect }) {
  useMapEvents({ click: (event) => onSelect(event.latlng) });
  return point ? <Marker position={[point.lat, point.lng]} icon={pickerPin} /> : null;
}

const splitDateTime = (event) => {
  if (!event) return { date: '', time: '' };

  if (event.startAt) {
    const startAt = new Date(event.startAt);
    if (!Number.isNaN(startAt.getTime())) {
      const pad = (value) => String(value).padStart(2, '0');
      return {
        date: `${startAt.getFullYear()}-${pad(startAt.getMonth() + 1)}-${pad(startAt.getDate())}`,
        time: `${pad(startAt.getHours())}:${pad(startAt.getMinutes())}`
      };
    }
  }

  const dateString = String(event.date || '');
  const match = dateString.match(/^(\d{4}-\d{2}-\d{2})(?:[T,\s]+(\d{1,2}:\d{2}))?/);
  if (match) return { date: match[1], time: event.time || match[2] || '' };
  if (event.date && event.time) return { date: event.date, time: event.time };

  return { date: '', time: '' };
};

const parseDuration = (duration) => {
  if (!duration) return { hours: '', minutes: '' };
  if (typeof duration === 'number') {
    const h = Math.floor(duration / 60);
    const m = duration % 60;
    return { hours: h ? String(h) : '', minutes: m ? String(m) : '' };
  }
  const str = String(duration);
  const hMatch = str.match(/(\d+)\s*ч/);
  const mMatch = str.match(/(\d+)\s*мин/);
  const onlyMinutes = /^\d+$/.test(str.trim()) ? parseInt(str, 10) : null;

  if (onlyMinutes !== null) {
    return { hours: Math.floor(onlyMinutes / 60) || '', minutes: onlyMinutes % 60 || '' };
  }
  return {
    hours: hMatch ? hMatch[1] : '',
    minutes: mMatch ? mMatch[1] : ''
  };
};

export const formatDuration = (hours, minutes) => {
  const h = parseInt(hours, 10) || 0;
  const m = parseInt(minutes, 10) || 0;
  if (!h && !m) return '';
  if (h && m) return `${h} ч ${m} мин`;
  if (h) return `${h} ч`;
  return `${m} мин`;
};

const CreateEventForm = ({
  onCreate, onCancel, userId, userName,
  userPhotoUrl,
  userAge,
  userCity,
  userAbout,
  city = 'Казань',
  cityCoords,
  initialEvent = null
}) => {
  const center = cityCoords || CITY_CENTERS[city] || DEFAULT_CENTER;

  const isEdit = Boolean(initialEvent);
  const dt = splitDateTime(initialEvent);
  const durationParsed = parseDuration(initialEvent?.duration);

  const initialFormat = initialEvent?.format
    || (initialEvent?.district === 'Онлайн' ? 'Онлайн' : 'Офлайн');
  const isOnlineInitially = initialFormat === 'Онлайн';

  const [formData, setFormData] = useState({
    title: initialEvent?.title || '',
    category: initialEvent?.category || '',
    date: dt.date,
    time: dt.time,
    durationHours: durationParsed.hours,
    durationMinutes: durationParsed.minutes,
    format: initialFormat,
    price: initialEvent?.price || 'Бесплатно',
    priceAmount: initialEvent?.priceAmount != null ? String(initialEvent.priceAmount) : '',
    address: /^-?\d{1,3}(?:\.\d+)?\s*,\s*-?\d{1,3}(?:\.\d+)?$/.test(initialEvent?.address || '')
      ? `${initialEvent?.city || city}, место на карте`
      : (isOnlineInitially ? '' : (initialEvent?.address || '')),
    district: isOnlineInitially ? '' : (initialEvent?.district || ''),
    city: isOnlineInitially ? '' : (initialEvent?.city || city),
    limit: initialEvent?.maxParticipants ? String(initialEvent.maxParticipants) : '',
    maxChatUrl: initialEvent?.maxChatUrl || '',
    description: initialEvent?.description || '',
    images: initialEvent?.images || (initialEvent?.image ? [initialEvent.image] : []),
    lat: isOnlineInitially ? null : (initialEvent?.lat ?? null),
    lng: isOnlineInitially ? null : (initialEvent?.lng ?? null),
  });

  const [newFiles, setNewFiles] = useState([]);
  const [errors, setErrors] = useState({});
  // ★ Для нового офлайн-события галочка по умолчанию не стоит.
  //   Для онлайн — не важна, проверим только когда format === 'Офлайн'.
  const [publicPlaceConfirmed, setPublicPlaceConfirmed] = useState(
    isEdit ? !isOnlineInitially : false
  );
  const [submitting, setSubmitting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [addressSearchLoading, setAddressSearchLoading] = useState(false);
  const [addressSearchError, setAddressSearchError] = useState('');
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [draftPoint, setDraftPoint] = useState(null);
  const [detectedCity, setDetectedCity] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const query = formData.address.trim();
    if (!showSuggestions || query.length < 3 || formData.format === 'Онлайн') {
      setAddressSuggestions([]);
      setAddressSearchLoading(false);
      setAddressSearchError('');
      return undefined;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setAddressSearchLoading(true);
      setAddressSearchError('');
      try {
        const selectedCity = String(formData.city || city || '').trim();
        const queryIncludesCity = selectedCity && query.toLocaleLowerCase().includes(selectedCity.toLocaleLowerCase());
        const result = await geocodeTouristAddress(
          queryIncludesCity || !selectedCity ? query : `${query}, ${selectedCity}`
        );
        if (active) {
          setAddressSuggestions(Array.isArray(result.addresses) ? result.addresses : []);
        }
      } catch (error) {
        if (active) {
          setAddressSuggestions([]);
          setAddressSearchError(error.message || 'Не удалось найти адрес');
        }
      } finally {
        if (active) setAddressSearchLoading(false);
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [formData.address, formData.city, formData.format, showSuggestions, city, isOnlineInitially]);

  const setField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const setFormat = (nextFormat) => {
    setFormData((prev) => {
      if (nextFormat === 'Онлайн') {
        return {
          ...prev,
          format: 'Онлайн',
          address: '',
          district: '',
          city: '',
          lat: null,
          lng: null,
        };
      }
      return {
        ...prev,
        format: 'Офлайн',
        lat: prev.lat ?? null,
        lng: prev.lng ?? null,
        city: prev.city || city,
      };
    });

    // ★ При уходе в онлайн «подтверждаем» галочку — она не нужна.
    //   Если потом вернёмся в офлайн, пользователь её проставит заново.
    if (nextFormat === 'Онлайн') {
      setPublicPlaceConfirmed(true);
    } else {
      setPublicPlaceConfirmed(false);
    }

    // Сбрасываем ошибку «publicPlace», чтобы она не висела на скрытом поле.
    setErrors((prev) => {
      if (!prev.publicPlace) return prev;
      const next = { ...prev };
      delete next.publicPlace;
      return next;
    });

    setDraftPoint(null);
    setDetectedCity(null);
    setShowMapPicker(false);
    setShowSuggestions(false);
  };

  const chooseSuggestion = (suggestion) => {
    const nearest = findNearestCity(suggestion.lat, suggestion.lng, 100);
    setFormData((prev) => ({
      ...prev,
      address: suggestion.label,
      district: nearest?.city.regionName || nearest?.city.name || prev.district,
      city: nearest?.city.name || prev.city,
      lat: suggestion.lat,
      lng: suggestion.lng
    }));
    setDraftPoint({ lat: suggestion.lat, lng: suggestion.lng });
    setShowMapPicker(true);
    setShowSuggestions(false);
    setAddressSuggestions([]);
    setAddressSearchError('');
  };

  const handleAddressChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      address: value,
      lat: null,
      lng: null,
    }));
    setErrors((prev) => (prev.address ? { ...prev, address: null } : prev));
    setDraftPoint(null);
    setDetectedCity(null);
    setShowSuggestions(true);
  };

  const chooseImage = (event) => {
    const files = Array.from(event.target.files || []).slice(0, 5);
    if (!files.length) return;
    if (files.some((file) => !file.type.startsWith('image/'))) {
      setErrors((prev) => ({ ...prev, image: 'Выберите файл изображения' }));
      return;
    }
    setNewFiles((prev) => [...prev, ...files].slice(0, Math.max(0, 5 - formData.images.length)));
    setErrors((prev) => ({ ...prev, image: null }));
    event.target.value = '';
  };

  const removeImage = (index) => {
    if (index < formData.images.length) {
      setField('images', formData.images.filter((_, i) => i !== index));
    } else {
      const fileIndex = index - formData.images.length;
      setNewFiles((prev) => prev.filter((_, i) => i !== fileIndex));
    }
  };

  const handleMapPointSelect = (latlng) => {
    setDraftPoint(latlng);

    const nearest = findNearestCity(latlng.lat, latlng.lng, 100);
    setDetectedCity(nearest?.city || null);

    setFormData((prev) => ({
      ...prev,
      lat: latlng.lat,
      lng: latlng.lng,
      city: nearest?.city.name || prev.city,
      address: nearest ? `${nearest.city.name}, место на карте` : prev.address,
      district: nearest?.city.name
        ? `${nearest.city.name}${nearest.city.regionName ? ', ' + nearest.city.regionName : ''}`
        : prev.district
    }));

    reverseGeocode(latlng.lat, latlng.lng).then((resolved) => {
      if (!resolved) return;
      const address = resolved.street
        ? [resolved.street, resolved.district, resolved.city].filter(Boolean).join(', ')
        : resolved.displayName || [resolved.district, resolved.city].filter(Boolean).join(', ');
      if (!address) return;
      setFormData((prev) => prev.lat === latlng.lat && prev.lng === latlng.lng ? {
        ...prev,
        address,
        district: resolved.district || prev.district,
        city: resolved.city || prev.city
      } : prev);
    }).catch(() => {});
  };

  const validate = () => {
    const nextErrors = {};
    const titleCheck = moderateContent(formData.title);
    const descriptionCheck = moderateContent(formData.description);
    if (!titleCheck.isClean) nextErrors.title = titleCheck.reason;
    if (!descriptionCheck.isClean) nextErrors.description = descriptionCheck.reason;
    if (!formData.title.trim()) nextErrors.title = 'Введите название';
    if (!formData.category) nextErrors.category = 'Выберите категорию';
    if (!formData.date) nextErrors.date = 'Укажите дату';
    if (!formData.time) nextErrors.time = 'Укажите время';

    if (formData.date && formData.time) {
      const dtValue = new Date(`${formData.date}T${formData.time}`);
      if (!Number.isNaN(dtValue.getTime()) && dtValue < new Date()) {
        nextErrors.date = 'Дата уже прошла';
      }
    }

    const h = parseInt(formData.durationHours, 10) || 0;
    const m = parseInt(formData.durationMinutes, 10) || 0;
    if (formData.durationHours && (h < 0 || h > 72)) {
      nextErrors.duration = 'Часы: от 0 до 72';
    }
    if (formData.durationMinutes && (m < 0 || m > 59)) {
      nextErrors.duration = 'Минуты: от 0 до 59';
    }
    if ((formData.durationHours || formData.durationMinutes) && h === 0 && m === 0) {
      nextErrors.duration = 'Укажите продолжительность больше 0';
    }

    if (formData.format === 'Офлайн') {
      if (!formData.address.trim()) nextErrors.address = 'Укажите место';
      else if (
        formData.lat == null ||
        formData.lng == null ||
        !Number.isFinite(Number(formData.lat)) ||
        !Number.isFinite(Number(formData.lng)) ||
        Number(formData.lat) < -90 ||
        Number(formData.lat) > 90 ||
        Number(formData.lng) < -180 ||
        Number(formData.lng) > 180
      ) {
        nextErrors.address = 'Выберите найденный адрес или укажите точку на карте';
      }
    }

    if (formData.limit) {
      const limit = Number.parseInt(formData.limit, 10);
      if (!Number.isFinite(limit) || limit < 1) nextErrors.limit = 'Минимум 1 участник';
      if (limit > 1000) nextErrors.limit = 'Максимум 1000 участников';
    }

    if (formData.price === 'Платно') {
      const priceAmount = Number(formData.priceAmount);
      if (!formData.priceAmount || !Number.isInteger(priceAmount) || priceAmount < 1) {
        nextErrors.priceAmount = 'Укажите стоимость целым числом от 1 ₽';
      }
    }

    const firstUrlImage = formData.images.find((img) => typeof img === 'string' && !img.startsWith('data:'));
    if (firstUrlImage) {
      const imageCheck = moderateUrl(firstUrlImage);
      if (!imageCheck.isClean) nextErrors.image = imageCheck.reason;
    }

    // ★ Проверяем галочку ТОЛЬКО для офлайн-событий.
    if (formData.format !== 'Онлайн' && !publicPlaceConfirmed) {
      nextErrors.publicPlace = 'Подтвердите, что встреча проходит в общественном месте';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      let uploadedUrls = [];
      if (newFiles.length) {
        uploadedUrls = await uploadImages(newFiles);
      }
      const preservedImages = formData.images.filter((img) => typeof img === 'string' && !img.startsWith('blob:'));
      const finalImages = [...preservedImages, ...uploadedUrls].filter(Boolean);

      const durationStr = formatDuration(formData.durationHours, formData.durationMinutes);
      const startAt = new Date(`${formData.date}T${formData.time}`).toISOString();

      const organizerProfile = {
        name: userName || 'Вы',
        photo_url: userPhotoUrl || undefined,
        age: userAge || undefined,
        city: userCity || formData.city || city,
        about: userAbout || undefined,
      };

      const isOnline = formData.format === 'Онлайн';

      const payload = {
        ...formData,
        priceAmount: formData.price === 'Платно' ? Number(formData.priceAmount) : null,
        date: `${formData.date}, ${formData.time}`,
        startAt,
        duration: durationStr,
        address: isOnline ? 'Онлайн' : formData.address,
        district: isOnline ? 'Онлайн' : (formData.district || formData.address),
        city: isOnline ? null : (formData.city || city),
        lat: isOnline ? null : formData.lat,
        lng: isOnline ? null : formData.lng,
        maxParticipants: Number.parseInt(formData.limit, 10) || 50,
        participants: isEdit ? initialEvent.participants : 1,
        distance: '0 км',
        rating: initialEvent?.rating || 0,
        reviewsCount: initialEvent?.reviewsCount || 0,
        image: finalImages[0] || getDefaultEventImage(formData.category),
        images: finalImages.length ? finalImages : undefined,
        organizerId: String(userId),
        organizerProfile,
      };

      await onCreate(payload, initialEvent?.id);
    } catch (error) {
      setErrors({ submit: error.message || 'Не удалось сохранить событие' });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmPoint = async () => {
    if (!draftPoint) return;

    const nearest = findNearestCity(draftPoint.lat, draftPoint.lng, 100);
    let resolved = null;
    try { resolved = await reverseGeocode(draftPoint.lat, draftPoint.lng); } catch {}

    setFormData((prev) => ({
      ...prev,
      lat: draftPoint.lat,
      lng: draftPoint.lng,
      address: resolved?.street
        ? [resolved.street, resolved.district, resolved.city].filter(Boolean).join(', ')
        : resolved?.displayName || [resolved?.district, resolved?.city].filter(Boolean).join(', ') || `${nearest?.city.name || prev.city}, место на карте`,
      district: resolved?.district || (nearest?.city.name
        ? `${nearest.city.name}${nearest.city.regionName ? ', ' + nearest.city.regionName : ''}`
        : (prev.district || prev.city)),
      city: resolved?.city || nearest?.city.name || prev.city
    }));

    setShowMapPicker(false);
  };

  const allImages = [
    ...formData.images.map((src, i) => ({ src, index: i })),
    ...newFiles.map((file, i) => ({ src: URL.createObjectURL(file), index: formData.images.length + i }))
  ];

  const isOnline = formData.format === 'Онлайн';

  return (
    <div className="create-form-v2">
      <div className="create-header">
        <button className="back-btn" onClick={onCancel} aria-label="Назад">
          <Icon name="arrowLeft" size={23} />
        </button>
        <div>
          <h1>{isEdit ? 'Редактировать событие' : 'Создать событие'}</h1>
          <p className="create-subtitle">Делитесь идеями. Собирайте людей. Делайте город ярче.</p>
        </div>
      </div>

      <form onSubmit={submit}>
        <div className="form-group">
          <label>Название события</label>
          <div className={`input-with-icon ${errors.title ? 'error' : ''}`}>
            <span className="input-icon"><Icon name="edit" size={21} /></span>
            <input value={formData.title} onChange={(e) => setField('title', e.target.value)} placeholder="Например, вечер настолок в «Смене»" />
          </div>
          {errors.title && <p className="error-text">{errors.title}</p>}
        </div>

        <div className="form-group">
          <label>Категория</label>
          <div className={`input-with-icon select-wrapper ${errors.category ? 'error' : ''}`}>
            <span className="input-icon"><Icon name="grid" size={21} /></span>
            <select value={formData.category} onChange={(e) => setField('category', e.target.value)}>
              <option value="">Выберите категорию</option>
              {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
            </select>
            <Icon name="chevronDown" className="select-chevron" size={18} />
          </div>
          {errors.category && <p className="error-text">{errors.category}</p>}
        </div>

        <div className="form-group">
          <label>Дата и время</label>
          <div className="form-row-2">
            <div className={`input-with-icon ${errors.date ? 'error' : ''}`}>
              <span className="input-icon"><Icon name="calendar" size={21} /></span>
              <input type="date" value={formData.date} onChange={(e) => setField('date', e.target.value)} />
            </div>
            <div className={`input-with-icon ${errors.time ? 'error' : ''}`}>
              <span className="input-icon"><Icon name="clock" size={21} /></span>
              <input type="time" value={formData.time} onChange={(e) => setField('time', e.target.value)} />
            </div>
          </div>
          {(errors.date || errors.time) && <p className="error-text">{errors.date || errors.time}</p>}
        </div>

        <div className="form-group">
          <label>Продолжительность</label>
          <div className="form-row-2">
            <div className={`input-with-icon ${errors.duration ? 'error' : ''}`}>
              <span className="input-icon"><Icon name="clock" size={21} /></span>
              <input type="number" min="0" max="72" value={formData.durationHours} onChange={(e) => setField('durationHours', e.target.value)} placeholder="Часы" />
            </div>
            <div className={`input-with-icon ${errors.duration ? 'error' : ''}`}>
              <span className="input-icon"><Icon name="clock" size={21} /></span>
              <input type="number" min="0" max="59" value={formData.durationMinutes} onChange={(e) => setField('durationMinutes', e.target.value)} placeholder="Минуты" />
            </div>
          </div>
          {errors.duration && <p className="error-text">{errors.duration}</p>}
          <p className="hint-text-with-icon">Укажите, сколько будет длиться событие. Например, для фильма — 2 ч 15 мин.</p>
        </div>

        <div className="form-group">
          <label>Формат</label>
          <div className="format-segmented">
            <button type="button" className={formData.format === 'Офлайн' ? 'active' : ''} onClick={() => setFormat('Офлайн')}>
              <Icon name="people" size={21} />Офлайн
            </button>
            <button type="button" className={formData.format === 'Онлайн' ? 'active' : ''} onClick={() => setFormat('Онлайн')}>
              <Icon name="monitor" size={21} />Онлайн
            </button>
          </div>
        </div>

        {!isOnline && (
          <div className="form-group">
            <label>Место проведения</label>
            <div className={`address-control input-with-icon ${errors.address ? 'error' : ''}`}>
              <span className="input-icon"><Icon name="pin" size={21} /></span>
              <input
                value={formData.address}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => window.setTimeout(() => setShowSuggestions(false), 120)}
                onChange={(e) => handleAddressChange(e.target.value)}
                placeholder="Введите адрес, место или заведение"
              />
              {showSuggestions && (
                <div className="address-suggestions">
                  {addressSuggestions.map((item) => (
                      <button type="button" key={`${item.lat},${item.lng}`} onMouseDown={(event) => {
                        event.preventDefault();
                        chooseSuggestion(item);
                      }}>
                        <Icon name="pin" size={17} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  {addressSearchLoading && <p className="address-search-status">Ищем адрес…</p>}
                  {!addressSearchLoading && addressSearchError && (
                    <p className="address-search-status address-search-status--error">{addressSearchError}</p>
                  )}
                  {!addressSearchLoading && !addressSearchError && formData.address.trim().length >= 3 && !addressSuggestions.length && (
                    <p className="address-search-status">Ничего не найдено. Попробуйте уточнить запрос или укажите точку на карте.</p>
                  )}
                </div>
              )}
            </div>
            {errors.address && <p className="error-text">{errors.address}</p>}

            <button
              type="button"
              className="map-picker-btn map-picker-full"
              onClick={() => {
                setDraftPoint((point) => point || {
                  lat: formData.lat ?? center.lat,
                  lng: formData.lng ?? center.lng,
                });
                setShowMapPicker((value) => !value);
              }}
            >
              <Icon name="map" size={21} />{showMapPicker ? 'Скрыть карту' : 'Указать на карте'}
            </button>

            {showMapPicker && (
              <div className="inline-location-picker">
                <div className="picker-map">
                  <MapContainer
                    key={`${draftPoint?.lat || formData.lat}-${draftPoint?.lng || formData.lng}`}
                    center={[
                      draftPoint?.lat ?? formData.lat ?? center.lat,
                      draftPoint?.lng ?? formData.lng ?? center.lng,
                    ]}
                    zoom={14}
                    scrollWheelZoom
                  >
                    <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <PointSelector point={draftPoint} onSelect={handleMapPointSelect} />
                  </MapContainer>
                </div>

                {detectedCity && (
                  <p className="hint-text-with-icon" style={{ color: '#2786f8', fontWeight: 600 }}>
                    <Icon name="pin" size={16} filled /> Определён город: {detectedCity.name}
                    {detectedCity.regionName ? `, ${detectedCity.regionName}` : ''}
                  </p>
                )}

                <button type="button" className="confirm-map-point" disabled={!draftPoint} onClick={confirmPoint}>
                  Готово, сохранить точку
                </button>
              </div>
            )}
            <p className="hint-text-with-icon">Введите место и выберите адрес из результатов поиска или отметьте точку на карте.</p>
          </div>
        )}

        <div className="form-group">
          <label>Лимит участников</label>
          <div className="limit-row">
            <div className={`input-with-icon ${errors.limit ? 'error' : ''}`}>
              <span className="input-icon"><Icon name="people" size={21} /></span>
              <input type="number" min="1" value={formData.limit} onChange={(e) => setField('limit', e.target.value)} placeholder="Например, 20" />
            </div>
            <span className="limit-hint">Оставьте пустым,<br />если нет ограничений</span>
          </div>
          {errors.limit && <p className="error-text">{errors.limit}</p>}
        </div>

        <div className="form-group">
          <label>Ссылка на чат в MAX (необязательно)</label>
          <div className="input-with-icon">
            <span className="input-icon"><Icon name="share" size={19} /></span>
            <input type="url" value={formData.maxChatUrl} onChange={(e) => setField('maxChatUrl', e.target.value)} placeholder="https://max.ru/join/..." />
          </div>
          <p className="hint-text-with-icon">Участники смогут открыть чат из карточки события.</p>
        </div>

        <div className="form-group">
          <label>Фотографии события</label>
          <input ref={fileInputRef} type="file" multiple accept="image/png,image/jpeg,image/webp" hidden onChange={chooseImage} />
          <div
            className="image-upload-row"
            role="button"
            tabIndex={0}
            onClick={(event) => {
              if (!event.target.closest('button')) fileInputRef.current?.click();
            }}
            onKeyDown={(event) => {
              if (!event.target.closest('button') && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); fileInputRef.current?.click(); }
            }}
          >
            <div className="image-preview-strip">
              {allImages.length ? allImages.map(({ src, index }) => (
                <div className="image-preview-item" key={`${src.slice(0, 32)}-${index}`}>
                  <img src={src} alt={`Фото ${index + 1}`} />
                  <button type="button" onClick={() => removeImage(index)}><Icon name="close" size={14} /></button>
                </div>
              )) : (
                <button type="button" className="image-placeholder" onClick={() => fileInputRef.current?.click()} aria-label="Выбрать фотографии"><Icon name="edit" size={25} /></button>
              )}
            </div>
            <div>
              <button type="button" className="upload-image-btn" onClick={() => fileInputRef.current?.click()}>
                Добавить фотографии
              </button>
              <p>Нажмите, чтобы выбрать фотографии. До 5 фото, PNG/JPG/WEBP.</p>
            </div>
          </div>
          {errors.image && <p className="error-text">{errors.image}</p>}
        </div>

        <div className="form-group">
          <label>Описание</label>
          <div className={`textarea-with-icon ${errors.description ? 'error' : ''}`}>
            <span className="textarea-icon"><Icon name="edit" size={21} /></span>
            <textarea rows="5" maxLength={1000} value={formData.description} onChange={(e) => setField('description', e.target.value)} placeholder="Расскажите подробнее о событии: что будет и какая атмосфера?" />
          </div>
          <p className="char-counter">{formData.description.length}/1000</p>
          {errors.description && <p className="error-text">{errors.description}</p>}
        </div>

        <div className="form-group">
          <label>Стоимость</label>
          <div className="format-segmented event-price-options">
            {['Бесплатно', 'Платно', 'Пушкинская карта'].map((price) => (
              <button
                type="button"
                key={price}
                className={formData.price === price ? 'active' : ''}
                onClick={() => {
                  setField('price', price);
                  if (price !== 'Платно') setField('priceAmount', '');
                }}
              >
                {price}
              </button>
            ))}
          </div>
          {formData.price === 'Платно' && (
            <label className="event-price-amount">
              Стоимость, ₽
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={formData.priceAmount}
                onChange={(e) => setField('priceAmount', e.target.value)}
                placeholder="Например, 500"
                aria-invalid={Boolean(errors.priceAmount)}
              />
              {errors.priceAmount && <span className="error-text">{errors.priceAmount}</span>}
            </label>
          )}
        </div>

        {!isOnline && (
          <>
            <div className="checkbox-group">
              <input type="checkbox" id="publicPlace" checked={publicPlaceConfirmed} onChange={(e) => setPublicPlaceConfirmed(e.target.checked)} />
              <label htmlFor="publicPlace">Подтверждаю, что мероприятие проходит в общественном месте</label>
            </div>
            {errors.publicPlace && <p className="error-text public-place-error">{errors.publicPlace}</p>}
          </>
        )}

        {errors.submit && <p className="error-text submit-error">{errors.submit}</p>}

        <button type="submit" className="submit-btn-v2" disabled={submitting}>
          {submitting ? 'Сохраняем...' : isEdit ? 'Сохранить изменения' : 'Создать событие'}
        </button>
      </form>
    </div>
  );
};

export default CreateEventForm;