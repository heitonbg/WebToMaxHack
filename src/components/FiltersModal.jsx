import React, { useState } from 'react';
import Icon from './Icon';

const FiltersModal = ({ onClose, onApply, initialFilters, sortBy = 'distance', onSortChange }) => {
  const [filters, setFilters] = useState(
    initialFilters || {
      time: null,
      distance: null,
      category: [],
      format: null,
      price: null,
      pushkinCard: false
    }
  );
  const [draftSort, setDraftSort] = useState(sortBy);

  const toggleCategory = (cat) => {
    setFilters((prev) => ({
      ...prev,
      category: prev.category.includes(cat)
        ? prev.category.filter((c) => c !== cat)
        : [...prev.category, cat]
    }));
  };

  const handleReset = () => {
    setFilters({
      time: null,
      distance: null,
      category: [],
      format: null,
      price: null,
      pushkinCard: false
    });
    setDraftSort('distance');
  };

  const handleApply = () => {
    onApply(filters);
    onSortChange?.(draftSort);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content filters-modal-v2" onClick={(e) => e.stopPropagation()}>
        <div className="filters-handle" />
        <div className="modal-header">
          <h2>Фильтры</h2>
          <button onClick={onClose} className="close-btn" aria-label="Закрыть"><Icon name="close" size={22} /></button>
        </div>
        <div className="filter-row-v2">
          <span className="filter-icon"><Icon name="sliders" size={25} /></span>
          <span className="filter-label">Сортировка</span>
          <div className="filter-chips">
            {[
              { id: 'distance', label: 'Ближайшие' },
              { id: 'popular', label: 'Популярные' },
              { id: 'new', label: 'Новые' }
            ].map((option) => (
              <button key={option.id} className={`chip ${draftSort === option.id ? 'active' : ''}`} onClick={() => setDraftSort(option.id)}>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-row-v2">
          <span className="filter-icon"><Icon name="clock" size={25} /></span>
          <span className="filter-label">Когда</span>
          <div className="filter-chips">
            {['Сейчас', 'Сегодня', 'Завтра'].map((t) => (
              <button
                key={t}
                className={`chip ${filters.time === t ? 'active' : ''}`}
                onClick={() => setFilters({ ...filters, time: filters.time === t ? null : t })}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-row-v2">
          <span className="filter-icon"><Icon name="pin" size={25} /></span>
          <span className="filter-label">Расстояние</span>
          <div className="filter-chips">
            {['до 1 км', 'до 3 км', 'до 5 км'].map((d) => (
              <button
                key={d}
                className={`chip ${filters.distance === d ? 'active' : ''}`}
                onClick={() => setFilters({ ...filters, distance: filters.distance === d ? null : d })}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-row-v2">
          <span className="filter-icon"><Icon name="grid" size={24} /></span>
          <span className="filter-label">Категория</span>
          <div className="filter-chips">
            {['Спорт', 'Культура', 'Настольные игры', 'Кино', 'Прогулка', 'Музыка'].map((c) => (
              <button
                key={c}
                className={`chip ${filters.category.includes(c) ? 'active' : ''}`}
                onClick={() => toggleCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-row-v2">
          <span className="filter-icon"><Icon name="people" size={25} /></span>
          <span className="filter-label">Формат</span>
          <div className="filter-chips">
            {['Онлайн', 'Офлайн'].map((f) => (
              <button
                key={f}
                className={`chip ${filters.format === f ? 'active' : ''}`}
                onClick={() => setFilters({ ...filters, format: filters.format === f ? null : f })}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-row-v2">
          <span className="filter-icon"><Icon name="ticket" size={25} /></span>
          <span className="filter-label">Стоимость</span>
          <div className="filter-chips">
            {['Бесплатно', 'Платно'].map((p) => (
              <button
                key={p}
                className={`chip ${filters.price === p ? 'active' : ''}`}
                onClick={() => setFilters({ ...filters, price: filters.price === p ? null : p })}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="pushkin-toggle-v2">
          <div className="pushkin-info">
            <div className="pushkin-icon">ПК</div>
            <div>
              <div className="pushkin-title">Пушкинская карта</div>
              <div className="pushkin-subtitle">
                Показывать события, доступные по Пушкинской карте
              </div>
            </div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={filters.pushkinCard}
              onChange={() =>
                setFilters({ ...filters, pushkinCard: !filters.pushkinCard })
              }
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="modal-actions">
          <button className="reset-btn" onClick={handleReset}>
            Сбросить
          </button>
          <button className="apply-btn" onClick={handleApply}>
            Показать события
          </button>
        </div>
      </div>
    </div>
  );
};

export default FiltersModal;
