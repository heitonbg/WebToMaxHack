import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import LegalDocument from './LegalDocument';
import { searchCities, findCityByName } from '../utils/citySearch';

const Profile = ({
  user, joinedIds, createdCount,
  notificationsOn, onToggleNotifications,
  theme, onToggleTheme,
  onLogout,
  profile = {}, onSaveProfile
}) => {
  const [showAbout, setShowAbout] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [legalPage, setLegalPage] = useState(null);
  const [draft, setDraft] = useState(profile);
  const [cityQuery, setCityQuery] = useState(profile.city || '');
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [cityError, setCityError] = useState('');
  const cityInputRef = useRef(null);

  useEffect(() => {
    setDraft(profile);
    setCityQuery(profile.city || '');
    setCityError('');
  }, [profile]);

  const userName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : 'Гость';

  const userInitial = userName.charAt(0).toUpperCase();
  const isDark = theme === 'dark';

  const handleCityChange = (value) => {
    setCityQuery(value);
    setCityError('');
    // ★ Синхронизируем draft, чтобы сохранение ушло с корректным значением
    setDraft((prev) => ({ ...prev, city: value }));
    if (value.trim().length < 2) {
      setCitySuggestions([]);
      return;
    }
    setCitySuggestions(searchCities(value, 8));
  };

  const handleCityPick = (picked) => {
    setCityQuery(picked.name);
    setDraft((prev) => ({ ...prev, city: picked.name }));
    setCitySuggestions([]);
    setCityError('');
    cityInputRef.current?.blur();
  };

  const handleCityBlur = () => {
    // Небольшая задержка, чтобы клик по подсказке успел отработать.
    setTimeout(() => {
      setCitySuggestions([]);
      const typed = cityQuery.trim();
      if (!typed) return;
      const match = findCityByName(typed);
      if (!match) {
        setCityError('Город не найден в справочнике. Выберите из подсказок.');
      } else {
        // Канонизируем написание (например, «кемерово» → «Кемерово»).
        setCityQuery(match.name);
        setDraft((prev) => ({ ...prev, city: match.name }));
      }
    }, 120);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // ★ Не даём сохранить невалидный город
    const typed = cityQuery.trim();
    if (typed) {
      const match = findCityByName(typed);
      if (!match) {
        setCityError('Город не найден в справочнике. Выберите из подсказок.');
        return;
      }
      setDraft((prev) => ({ ...prev, city: match.name }));
    }

    onSaveProfile?.({ ...draft, city: typed ? findCityByName(typed)?.name || '' : '' });
    setIsEditing(false);
  };

  return (
    <div className="profile-page">
      <h2 className="page-title">Профиль</h2>

      <div className="profile-card">
        <div className="profile-avatar">
          {user?.photo_url ? <img src={user.photo_url} alt={userName} /> : <span>{userInitial}</span>}
        </div>
        <div className="profile-info">
          <h3>{userName}</h3>
          <p className="profile-id">{[draft.age && `${draft.age} лет`, draft.city].filter(Boolean).join(' · ') || (user?.id ? `ID: ${user.id}` : 'Гость')}</p>
          <p className="profile-username">{user?.username ? `@${user.username}` : ''}</p>
        </div>
        <button className="profile-edit-btn" onClick={() => setIsEditing((value) => !value)}>{isEditing ? 'Отмена' : 'Изменить'}</button>
      </div>

      {isEditing ? (
        <form className="profile-section profile-edit-form" onSubmit={handleSubmit}>
          <h4>О себе</h4>
          <label>Возраст<input type="number" min="14" max="120" value={draft.age || ''} onChange={(e) => setDraft((prev) => ({ ...prev, age: e.target.value ? Number(e.target.value) : '' }))} placeholder="Например, 24" /></label>
          <label>
            Город
            <div className="profile-city-field">
              <input
                ref={cityInputRef}
                maxLength="80"
                value={cityQuery}
                onChange={(e) => handleCityChange(e.target.value)}
                onBlur={handleCityBlur}
                onFocus={() => {
                  if (cityQuery.trim().length >= 2) {
                    setCitySuggestions(searchCities(cityQuery, 8));
                  }
                }}
                placeholder="Например, Казань"
                autoComplete="off"
              />
              {citySuggestions.length > 0 && (
                <ul className="profile-city-suggestions">
                  {citySuggestions.map((c) => (
                    <li key={`${c.geonameid}-${c.name}`}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleCityPick(c)}
                      >
                        <span>
                          <strong>{c.name}</strong>
                          {c.regionName && <small>{c.regionName}</small>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {cityError && <p className="error-text">{cityError}</p>}
          </label>
          <label>О себе<textarea rows="4" maxLength="500" value={draft.about || ''} onChange={(e) => setDraft((prev) => ({ ...prev, about: e.target.value }))} placeholder="Расскажите, чем любите заниматься" /></label>
          <button className="primary-btn" type="submit">Сохранить профиль</button>
        </form>
      ) : draft.about ? <section className="profile-section profile-about"><h4>О себе</h4><p>{draft.about}</p></section> : null}

      <div className="profile-stats">
        <div className="stat-item">
          <div className="stat-value">{joinedIds.length}</div>
          <div className="stat-label">Участий</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{createdCount}</div>
          <div className="stat-label">Создано</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">0</div>
          <div className="stat-label">Рейтинг</div>
        </div>
      </div>

      <div className="profile-section">
        <h4>Настройки</h4>
        <div className="settings-row">
          <span><Icon name="calendar" size={19} /> Уведомления о событиях</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={Boolean(notificationsOn)}
              onChange={(e) => onToggleNotifications?.(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>
        <div className="settings-row">
          <span><Icon name="grid" size={19} /> Тёмная тема</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={isDark}
              onChange={(e) => onToggleTheme?.(e.target.checked ? 'dark' : 'light')}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <div className="profile-section">
        <h4>О приложении</h4>
        <button className="settings-row-button" onClick={() => setShowAbout(!showAbout)}>
          <span>О MAX Events</span>
          <span>{showAbout ? '▼' : '▶'}</span>
        </button>
        {showAbout && (
          <div className="about-text">
            <p><strong>MAX Events</strong> — сервис для поиска и создания досуговых событий: спорт, настолки, культура, кино.</p>
            <p>Версия: 1.0.0 (MVP)</p>
            <p>Разработчик: команда <strong>neutralname</strong></p>
            <p>Обработка данных: 152-ФЗ</p>
            <p>Модерация контента: активна</p>
          </div>
        )}
      </div>

      <div className="profile-section">
        <button className="settings-row-button" type="button" onClick={() => setLegalPage('privacy')}><span>Политика конфиденциальности</span><span>▶</span></button>
        <button className="settings-row-button" type="button" onClick={() => setLegalPage('terms')}><span>Пользовательское соглашение</span><span>▶</span></button>
      </div>

      {legalPage && <LegalDocument type={legalPage} onClose={() => setLegalPage(null)} onSwitch={setLegalPage} />}
      <p className="profile-footer">© 2026 MAX Events · Команда <strong>neutralname</strong></p>
    </div>
  );
};

export default Profile;
