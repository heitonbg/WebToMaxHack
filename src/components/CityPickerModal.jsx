// src/components/CityPickerModal.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import { searchCities, getTopCities } from '../utils/citySearch';

const CityPickerModal = ({ isOpen, currentCity, onSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setDebounced('');
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 120);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    if (!debounced.trim()) return getTopCities(30);
    return searchCities(debounced, 60);
  }, [debounced]);

  if (!isOpen) return null;

  const currentCityName = typeof currentCity === 'string'
    ? currentCity
    : currentCity?.name || '';

  return (
    <div className="city-picker-overlay" onClick={onClose}>
      <div className="city-picker" onClick={(e) => e.stopPropagation()}>
        <div className="city-picker-head">
          <h2>Выберите город</h2>
          <button className="city-picker-close" onClick={onClose} aria-label="Закрыть">
            <Icon name="close" size={22} />
          </button>
        </div>

        <div className="city-picker-search">
          <Icon name="search" size={20} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Город, ПГТ, село..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
          {query && (
            <button className="city-picker-clear" onClick={() => setQuery('')} aria-label="Очистить">
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        <div className="city-picker-list">
          {results.length === 0 ? (
            <div className="city-picker-empty">
              <p>Ничего не найдено</p>
              <small>Попробуйте изменить запрос</small>
            </div>
          ) : (
            results.map((city) => {
              const isActive = city.name === currentCityName;
              return (
                <button
                  key={`${city.geonameid}-${city.name}`}
                  className={`city-picker-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelect(city)}
                >
                  <span className="city-picker-icon">
                    <Icon name="pin" size={18} filled />
                  </span>
                  <span className="city-picker-info">
                    <strong>{city.name}</strong>
                    <small>
                      {city.type && <>{capitalize(city.type)} · </>}
                      {city.regionName || ''}
                      {city.population > 0 && <> · {formatPopulation(city.population)}</>}
                    </small>
                  </span>
                  {isActive && <Icon name="star" size={18} filled />}
                </button>
              );
            })
          )}
        </div>

        {!query && (
          <div className="city-picker-hint">
            Показаны крупные города. Начните вводить название — найдём ваш.
          </div>
        )}
      </div>
    </div>
  );
};

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatPopulation(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')} млн`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} тыс.`;
  return String(n);
}

export default CityPickerModal;