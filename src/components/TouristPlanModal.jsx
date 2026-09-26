import React, { useEffect, useState } from 'react';
import Icon from './Icon';
import { generateTouristPlan } from '../api/events';

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

const TouristPlanModal = ({ initialCity, onClose, onEventClick }) => {
  const [city, setCity] = useState(initialCity || '');
  const [date, setDate] = useState(getLocalDate);
  const [query, setQuery] = useState('');
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [loading, onClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setPlan(null);
    try {
      setPlan(await generateTouristPlan({ city, date, query }));
    } catch (requestError) {
      setError(requestError.message || 'Не удалось составить план. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

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
            <span className="tourist-plan-eyebrow">Ваш день в городе</span>
            <h2 id="tourist-plan-title">Собрать план</h2>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Закрыть">
            <Icon name="close" size={22} />
          </button>
        </div>

        <form className="tourist-plan-form" onSubmit={handleSubmit}>
          <div className="tourist-plan-fields">
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
              Дата
              <input
                required
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
          </div>
          <label className="tourist-plan-query">
            Что вам интересно?
            <textarea
              required
              maxLength={500}
              rows={3}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Например: искусство и прогулки, без дорогих событий"
            />
          </label>
          <p className="tourist-plan-privacy">
            Запрос и данные о встречах передаются AI-провайдеру для составления плана.
          </p>
          <button className="tourist-plan-submit" type="submit" disabled={loading}>
            <Icon name="compass" size={19} />
            {loading ? 'Составляем маршрут…' : 'Составить план'}
          </button>
        </form>

        {error && <p className="tourist-plan-error" role="alert">{error}</p>}

        {plan && (
          <div className="tourist-plan-result" aria-live="polite">
            {plan.summary && <p className="tourist-plan-summary">{plan.summary}</p>}
            <ol className="tourist-plan-timeline">
              {plan.events.map((event) => (
                <li key={event.id}>
                  <span className="tourist-plan-time">{formatTime(event)}</span>
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
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </div>
  );
};

export default TouristPlanModal;
