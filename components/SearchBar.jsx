import React from 'react';
import Icon from './Icon';

const SearchBar = ({ value, onChange, onOpenFilters, activeFiltersCount = 0 }) => {
  return (
    <div className="search-bar">
      <span className="search-icon"><Icon name="search" size={22} /></span>
      <input
        type="text"
        placeholder="Что хотите поделать?"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        className="filter-btn"
        onClick={onOpenFilters}
        aria-label={`Фильтры${activeFiltersCount ? `, активно: ${activeFiltersCount}` : ''}`}
      >
        <Icon name="sliders" size={23} />
        {activeFiltersCount > 0 && (
          <span className="filter-badge">{activeFiltersCount}</span>
        )}
      </button>
    </div>
  );
};

export default SearchBar;