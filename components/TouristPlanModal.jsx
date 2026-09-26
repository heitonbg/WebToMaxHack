import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import TouristRouteMap from './TouristRouteMap';
import { generateTouristPlan, saveTouristPlan, searchTouristPlaces } from '../api/events';
import { touristPlanStorage } from '../utils/touristPlanStorage';
import { findCityByName } from '../utils/citySearch';
import { buildTouristMapLinks, getTouristRouteStops } from '../utils/touristMapLinks';

const INTERESTS = ['Культура', 'Спорт', 'Кино', 'Прогулка', 'Музыка', 'Настольные игры'];

const getLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTime = (event) => {
  const start = event.startAt ? new Date(event.startAt) : null;
  if (start && !Number.isNaN(start.getTime())) {
    return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(start);
  }
  return String(event.date || '').match(/\d{1,2}:\d{2}/)?.[0] || 'В течение дня';
};

const formatDay = (event) => {
  const date = event.startAt ? new Date(event.startAt) : null;
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }).format(date)
    : String(event.date || '').split(',')[0];
};

const formatPlanSummary = (events) => {
  const count = events.length;
  const remainder100 = count % 100;
  const remainder10 = count % 10;
  const noun = remainder100 >= 11 && remainder100 <= 14
    ? 'событий'
    : remainder10 === 1
      ? 'событие'
      : remainder10 >= 2 && remainder10 <= 4
        ? 'события'
        : 'событий';
  return `Маршрут: ${count} ${noun}`;
};

const formatOptionsCount = (count) => {
  const remainder100 = count % 100;
  const remainder10 = count % 10;
  const noun = remainder100 >= 11 && remainder100 <= 14
    ? 'вариантов'
    : remainder10 === 1
      ? 'вариант'
      : remainder10 >= 2 && remainder10 <= 4
        ? 'варианта'
        : 'вариантов';
  return `${count} ${noun} поездки`;
};

const TouristPlanModal = ({ initialCity, initialPlan, userId, onClose, onEventClick, onSave }) => {
  const [city, setCity] = useState(initialPlan?.city || initialCity || '');
  const [date, setDate] = useState(initialPlan?.date || getLocalDate());
  const [days, setDays] = useState(initialPlan?.days || 1);
  const [interests, setInterests] = useState(initialPlan?.interests || []);
  const [budget, setBudget] = useState(initialPlan?.budget || 'any');
  const [maxDistanceKm, setMaxDistanceKm] = useState(
    initialPlan?.maxDistanceKm === undefined ? 5 : initialPlan.maxDistanceKm
  );
  const [query, setQuery] = useState(initialPlan?.query || '');
  const [plan, setPlan] = useState(() => {
    if (Array.isArray(initialPlan?.options)) {
      return {
        days: initialPlan.days || 1,
        interests: initialPlan.interests || [],
        budget: initialPlan.budget || 'any',
        maxDistanceKm: initialPlan.maxDistanceKm ?? 5,
        query: initialPlan.query || '',
        ...initialPlan,
        selectedOptionId: initialPlan.selectedOptionId || initialPlan.options[0]?.id,
      };
    }
    if (Array.isArray(initialPlan?.events) && initialPlan.events.length) {
      return {
        days: 1,
        interests: [],
        budget: 'any',
        maxDistanceKm: 5,
        query: '',
        ...initialPlan,
        options: [{ id: 'saved-route', title: 'Сохранённый маршрут', events: initialPlan.events }],
        selectedOptionId: 'saved-route',
      };
    }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(
    initialPlan?.storage === 'server' ? 'synced' : initialPlan?.savedAt ? 'device' : 'draft'
  );
  const [offlinePinned, setOfflinePinned] = useState(Boolean(initialPlan?.offlinePinned));
  const [planDirty, setPlanDirty] = useState(false);
  const [placesKind, setPlacesKind] = useState('both');
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [placesError, setPlacesError] = useState('');
  const [error, setError] = useState('');
  const revisionRef = useRef(0);
  const savingRef = useRef(false);
  const saveTimerRef = useRef(null);

  const markPlanDirty = () => {
    revisionRef.current += 1;
    setPlanDirty(true);
    setSaveStatus('dirty');
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [loading, onClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const cityData = findCityByName(city);
    if (maxDistanceKm && !cityData) {
      setError('Для ограничения расстояния выберите город из справочника.');
      return;
    }
    setLoading(true);
    setError('');
    const request = {
      city,
      date,
      days: Number(days),
      interests,
      budget,
      maxDistanceKm: maxDistanceKm || null,
      center: cityData ? { lat: cityData.lat, lng: cityData.lng } : null,
      query: query.trim(),
    };
    try {
      const generated = await generateTouristPlan(request);
      setPlan({
        ...request,
        ...generated,
        savedAt: null,
        selectedOptionId: generated.options[0]?.id || null,
        offlinePinned,
      });
      markPlanDirty();
    } catch (requestError) {
      setError(requestError.message || 'Не удалось составить план. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const selectedOption = plan?.options?.find((option) => option.id === plan.selectedOptionId) || plan?.options?.[0];
  const sameInterests = plan?.interests?.length === interests.length &&
    interests.every((interest) => plan.interests.includes(interest));
  const isCurrentPlan = plan?.city === city && plan?.date === date &&
    Number(plan.days) === Number(days) && plan.budget === budget &&
    Number(plan.maxDistanceKm || 0) === Number(maxDistanceKm || 0) &&
    sameInterests && plan.query === query.trim();

  useEffect(() => {
    if (!plan || !planDirty || !isCurrentPlan || !plan.options?.some((option) => option.events.length)) return undefined;

    const revision = revisionRef.current;
    const snapshot = plan;
    const save = async () => {
      if (savingRef.current) {
        saveTimerRef.current = window.setTimeout(save, 300);
        return;
      }
      savingRef.current = true;
      setSaveStatus('saving');
      setError('');
      touristPlanStorage.save(userId, {
        ...snapshot,
        storage: 'device',
        offlinePinned,
      });
      try {
        const response = await saveTouristPlan(snapshot);
        if (revisionRef.current === revision) {
          const synced = {
            ...response.plan,
            storage: 'server',
            offlinePinned,
          };
          touristPlanStorage.save(userId, synced);
          setPlan(synced);
          setPlanDirty(false);
          setSaveStatus('synced');
          onSave?.(response.plan);
        }
      } catch (requestError) {
        if (revisionRef.current === revision) {
          setPlanDirty(false);
          setSaveStatus('device');
          setError(`Маршрут сохранён локально, но не синхронизирован: ${requestError.message}`);
        }
      } finally {
        savingRef.current = false;
      }
    };
    saveTimerRef.current = window.setTimeout(save, 650);
    return () => window.clearTimeout(saveTimerRef.current);
  }, [plan, planDirty, isCurrentPlan, userId, offlinePinned, onSave]);

  const handleSaveOffline = () => {
    if (!plan || !isCurrentPlan || !selectedOption?.events.length) return;
    const saved = touristPlanStorage.pinOffline(userId, plan);
    if (!saved) {
      setError('Не удалось сохранить маршрут на этом устройстве. Проверьте свободное место.');
      return;
    }
    setOfflinePinned(true);
    setPlan(saved);
    setError('');
  };

  const handleRemoveEvent = (eventId) => {
    setPlan((current) => ({
      ...current,
      options: current.options.map((option) => option.id === current.selectedOptionId
        ? { ...option, events: option.events.filter((event) => event.id !== eventId) }
        : option),
      savedAt: null,
    }));
    markPlanDirty();
  };

  const toggleInterest = (interest) => {
    setInterests((current) => current.includes(interest)
      ? current.filter((item) => item !== interest)
      : [...current, interest]);
  };

  const selectOption = (optionId) => {
    setPlan((current) => ({ ...current, selectedOptionId: optionId, savedAt: null }));
    markPlanDirty();
  };

  const findPlaces = async () => {
    const eventIds = selectedOption?.events.map((event) => event.id) || [];
    if (!eventIds.length) return;
    setPlacesLoading(true);
    setPlacesError('');
    try {
      const result = await searchTouristPlaces({ eventIds, kind: placesKind });
      setPlaceSuggestions(result.places || []);
      if (!result.places?.length) setPlacesError('Рядом с событиями не нашлось подходящих мест.');
    } catch (requestError) {
      setPlacesError(requestError.message || 'Не удалось загрузить места поблизости.');
    } finally {
      setPlacesLoading(false);
    }
  };

  const togglePlace = (place) => {
    setPlan((current) => ({
      ...current,
      options: current.options.map((option) => {
        if (option.id !== current.selectedOptionId) return option;
        const selected = option.places || [];
        const exists = selected.some((item) => item.id === place.id);
        return {
          ...option,
          places: exists ? selected.filter((item) => item.id !== place.id) : [...selected, place],
        };
      }),
      savedAt: null,
    }));
    markPlanDirty();
  };

  const routeStops = selectedOption ? getTouristRouteStops(selectedOption) : [];
  const mapLinks = buildTouristMapLinks(routeStops);

  return (
    <div className="modal-overlay tourist-plan-overlay" onClick={onClose}>
      <section
        className="modal-content tourist-plan-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tourist-plan-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="tourist-plan-heading">
          <div>
            <span className="tourist-plan-eyebrow">План поездки</span>
            <h2 id="tourist-plan-title">Туристический маршрут</h2>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Закрыть">
            <Icon name="close" size={22} />
          </button>
        </div>

        <form className="tourist-plan-form" onSubmit={handleSubmit}>
          <div className="tourist-plan-fields tourist-plan-primary-fields">
            <label>
              Город
              <input
                required
                maxLength={80}
                value={city}
                onChange={(event) => setCity(event.target.value)}
                autoComplete="address-level2"
              />
            </label>
            <label>
              Начало поездки
              <input
                required
                type="date"
                min={getLocalDate()}
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <label>
              Дней в городе
              <input
                required
                type="number"
                min="1"
                max="7"
                value={days}
                onChange={(event) => setDays(Math.max(1, Math.min(7, Number(event.target.value) || 1)))}
              />
            </label>
          </div>
          <fieldset className="tourist-plan-interests">
            <legend>Интересы</legend>
            <div>
              {INTERESTS.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  className={`tourist-plan-interest ${interests.includes(interest) ? 'active' : ''}`}
                  aria-pressed={interests.includes(interest)}
                  onClick={() => toggleInterest(interest)}
                >
                  {interest}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="tourist-plan-fields tourist-plan-preferences">
            <fieldset>
              <legend>Бюджет</legend>
              <div className="tourist-plan-choice-row">
                <button type="button" className={budget === 'free' ? 'active' : ''} aria-pressed={budget === 'free'} onClick={() => setBudget('free')}>Бесплатные</button>
                <button type="button" className={budget === 'any' ? 'active' : ''} aria-pressed={budget === 'any'} onClick={() => setBudget('any')}>Любые</button>
              </div>
            </fieldset>
            <fieldset>
              <legend>Радиус от центра</legend>
              <div className="tourist-plan-choice-row">
                {[3, 5, 10].map((radius) => (
                  <button
                    key={radius}
                    type="button"
                    className={Number(maxDistanceKm) === radius ? 'active' : ''}
                    aria-pressed={Number(maxDistanceKm) === radius}
                    onClick={() => setMaxDistanceKm(radius)}
                  >
                    {radius} км
                  </button>
                ))}
                <button type="button" className={!maxDistanceKm ? 'active' : ''} aria-pressed={!maxDistanceKm} onClick={() => setMaxDistanceKm(null)}>Любой</button>
              </div>
            </fieldset>
          </div>
          <label className="tourist-plan-query">
            Дополнительные пожелания
            <textarea
              maxLength={500}
              rows={3}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Например: начать после 11, спокойный темп"
            />
          </label>
          <p className="tourist-plan-privacy">
            Учитываются интересы, длительность, бюджет и расстояние. Запрос и встречи передаются AI-провайдеру.
          </p>
          <button className="tourist-plan-submit" type="submit" disabled={loading}>
            <Icon name="compass" size={19} />
            {loading ? 'Составляем варианты…' : plan ? 'Обновить варианты' : 'Составить варианты'}
          </button>
        </form>

        {error && <p className="tourist-plan-error" role="alert">{error}</p>}

        {plan && !isCurrentPlan && (
          <p className="tourist-plan-stale" role="status">
            Параметры изменены. Составьте маршрут заново, чтобы применить их.
          </p>
        )}

        {plan && (
          <div className="tourist-plan-result" aria-live="polite">
            <div className="tourist-plan-result-heading">
              <p className="tourist-plan-summary">
                {plan.options.length === 1 ? 'Сохранённый маршрут' : formatOptionsCount(plan.options.length)}
              </p>
              <span className={`tourist-plan-save-state ${saveStatus === 'synced' ? 'is-saved' : ''}`}>
                {offlinePinned
                  ? 'Офлайн-копия на устройстве'
                  : saveStatus === 'saving'
                    ? 'Сохраняем…'
                    : saveStatus === 'synced'
                      ? 'Синхронизирован с MAX'
                      : saveStatus === 'device'
                        ? 'Пока только на устройстве'
                        : saveStatus === 'dirty'
                          ? 'Синхронизация…'
                          : 'Черновик'}
              </span>
            </div>
            <div className="tourist-plan-options" role="group" aria-label="Варианты маршрута">
              {plan.options.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selectedOption?.id === option.id}
                  className={selectedOption?.id === option.id ? 'active' : ''}
                  onClick={() => selectOption(option.id)}
                >
                  {option.title || `Вариант ${index + 1}`}
                  <small>{formatPlanSummary(option.events)}</small>
                </button>
              ))}
            </div>
            {selectedOption && (
              <>
                <p className="tourist-plan-summary">{formatPlanSummary(selectedOption.events)}</p>
                <ol className="tourist-plan-timeline">
                  {selectedOption.events.map((event) => (
                    <React.Fragment key={event.id}>
                      <li>
                        <span className="tourist-plan-time">
                          {formatTime(event)}
                          {Number(days) > 1 && <small>{formatDay(event)}</small>}
                        </span>
                        <button
                          type="button"
                          className="tourist-plan-event"
                          onClick={() => {
                            onClose();
                            onEventClick(event);
                          }}
                        >
                          <span className="tourist-plan-event-category">{event.category}</span>
                          <strong>{event.title}</strong>
                          <span>{event.address || event.district || 'Адрес уточняется'}</span>
                          <span className="tourist-plan-event-meta">
                            {event.price || 'Стоимость уточняется'}
                            {event.maxParticipants
                              ? ` · ${event.participants}/${event.maxParticipants} мест`
                              : ''}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="tourist-plan-remove"
                          aria-label={`Убрать «${event.title}» из маршрута`}
                          title="Убрать из маршрута"
                          onClick={() => handleRemoveEvent(event.id)}
                        >
                          <Icon name="close" size={17} />
                        </button>
                      </li>
                      {(selectedOption.places || [])
                        .filter((place) => String(place.eventId) === String(event.id))
                        .map((place) => (
                          <li className="tourist-plan-place-stop" key={place.id}>
                            <span className="tourist-plan-time"><Icon name="pin" size={15} /></span>
                            <span className="tourist-plan-place-description">
                              <small>{place.kindLabel} · OSM</small>
                              <strong>{place.name}</strong>
                              <span>{place.address || `Рядом: ${event.title}`}</span>
                            </span>
                            <button
                              type="button"
                              className="tourist-plan-remove"
                              aria-label={`Убрать «${place.name}» из маршрута`}
                              onClick={() => togglePlace(place)}
                            >
                              <Icon name="close" size={17} />
                            </button>
                          </li>
                        ))}
                    </React.Fragment>
                  ))}
                </ol>
                <section className="tourist-place-picker">
                  <div className="tourist-place-picker-heading">
                    <div>
                      <h3>Добавить остановки</h3>
                      <p>Кафе, рестораны и достопримечательности рядом с событиями</p>
                    </div>
                    <Icon name="pin" size={20} />
                  </div>
                  <div className="tourist-place-actions">
                    <div className="tourist-place-kind" role="group" aria-label="Тип мест">
                      {[
                        { id: 'both', label: 'Все' },
                        { id: 'restaurants', label: 'Еда' },
                        { id: 'attractions', label: 'Места' },
                      ].map((kind) => (
                        <button
                          key={kind.id}
                          type="button"
                          className={placesKind === kind.id ? 'active' : ''}
                          aria-pressed={placesKind === kind.id}
                          onClick={() => setPlacesKind(kind.id)}
                        >
                          {kind.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="tourist-place-search"
                      disabled={placesLoading || !selectedOption.events.some((event) => event.lat != null && event.lng != null)}
                      onClick={findPlaces}
                    >
                      {placesLoading ? 'Ищем…' : 'Найти рядом'}
                    </button>
                  </div>
                  <p className="tourist-place-attribution">Данные OpenStreetMap. Часы работы и актуальность уточняйте на месте.</p>
                  {placesError && <p className="tourist-plan-stale" role="status">{placesError}</p>}
                  {placeSuggestions.length > 0 && (
                    <ul className="tourist-place-results">
                      {placeSuggestions.map((place) => {
                        const isAdded = (selectedOption.places || []).some((item) => item.id === place.id);
                        return (
                          <li key={place.id}>
                            <span>
                              <strong>{place.name}</strong>
                              <small>{place.kindLabel} · {place.distanceKm} км</small>
                            </span>
                            <button
                              type="button"
                              className={isAdded ? 'active' : ''}
                              aria-pressed={isAdded}
                              onClick={() => togglePlace(place)}
                            >
                              {isAdded ? 'Добавлено' : 'Добавить'}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
                {mapLinks && (
                  <>
                    <TouristRouteMap stops={routeStops} />
                    <div className="tourist-map-exports">
                      <a href={mapLinks.yandex} target="_blank" rel="noreferrer">Яндекс Карты</a>
                      <a href={mapLinks.twoGis} target="_blank" rel="noreferrer">2ГИС</a>
                    </div>
                  </>
                )}
            {selectedOption.events.length === 0 ? (
              <p className="tourist-plan-stale">В этом варианте пока нет событий. Обновите варианты.</p>
            ) : (
              <button
                type="button"
                className="tourist-plan-save"
                disabled={!isCurrentPlan || offlinePinned}
                onClick={handleSaveOffline}
              >
                <Icon name={offlinePinned ? 'calendar' : 'plus'} size={18} />
                {offlinePinned ? 'Офлайн-копия сохранена' : 'Сохранить офлайн-копию'}
              </button>
            )}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default TouristPlanModal;
