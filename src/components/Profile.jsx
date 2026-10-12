// src/components/Profile.jsx
import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import LegalDocument from './LegalDocument';
import { searchCities, findCityByName } from '../utils/citySearch';
import { extractMaxUserLink } from '../utils/maxBridge';

const Profile = ({
  user, joinedIds, createdCount,
  friendsCount = 0,
  incomingRequestsCount = 0,
  onOpenFriends,
  notificationsOn, onToggleNotifications,
  theme, onToggleTheme,
  onLogout,
  profile = {}, onSaveProfile,
}) => {
  const [showAbout, setShowAbout] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [legalPage, setLegalPage] = useState(null);
  const [draft, setDraft] = useState(profile);
  const [cityQuery, setCityQuery] = useState(profile.city || '');
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [cityError, setCityError] = useState('');
  const [maxLinkError, setMaxLinkError] = useState('');
  const cityInputRef = useRef(null);

  // ★ Флаг: пользователь только что выбрал город из подсказки.
  //   Пока он установлен, handleCityBlur не должен показывать «город не найден».
  const pickedFromSuggestionsRef = useRef(false);

  useEffect(() => {
    setDraft(profile);
    setCityQuery(profile.city || '');
    setCityError('');
    setMaxLinkError('');
    pickedFromSuggestionsRef.current = false;
  }, [profile]);

  const userName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : 'Гость';

  const userInitial = userName.charAt(0).toUpperCase();
  const isDark = theme === 'dark';

  const handleCityChange = (value) => {
    // ★ Если пользователь снова начал печатать — сбрасываем флаг.
    pickedFromSuggestionsRef.current = false;
    setCityQuery(value);
    setCityError('');
    setDraft((prev) => ({ ...prev, city: value }));
    if (value.trim().length < 2) {
      setCitySuggestions([]);
      return;
    }
    setCitySuggestions(searchCities(value, 8));
  };

  const handleCityPick = (picked) => {
    // ★ Ставим флаг, чтобы blur знал: это осознанный выбор.
    pickedFromSuggestionsRef.current = true;
    setCityQuery(picked.name);
    setDraft((prev) => ({ ...prev, city: picked.name }));
    setCitySuggestions([]);
    setCityError('');
    cityInputRef.current?.blur();
  };

  const handleCityBlur = () => {
    setTimeout(() => {
      setCitySuggestions([]);

      // ★ Свежий выбор из подсказки — не проверяем ввод.
      if (pickedFromSuggestionsRef.current) {
        pickedFromSuggestionsRef.current = false;
        return;
      }

      const typed = cityQuery.trim();
      if (!typed) return;

      const match = findCityByName(typed);
      if (!match) {
        setCityError('Город не найден в справочнике. Выберите из подсказок.');
      } else {
        setCityQuery(match.name);
        setDraft((prev) => ({ ...prev, city: match.name }));
      }
    }, 120);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const maxLinkText = String(draft.maxLink || '').trim();
    const maxLink = extractMaxUserLink(maxLinkText);
    if (maxLinkText && !maxLink) {
      setMaxLinkError('Вставьте приглашение из MAX со ссылкой вида https://max.ru/u/…');
      return;
    }

    const typed = cityQuery.trim();
    if (typed) {
      const match = findCityByName(typed);
      if (!match) {
        setCityError('Город не найден в справочнике. Выберите из подсказок.');
        return;
      }
      setDraft((prev) => ({ ...prev, city: match.name }));
    }

    onSaveProfile?.({
      ...draft,
      city: typed ? findCityByName(typed)?.name || '' : '',
      maxLink,
    });
    setIsEditing(false);
  };

  return (
    <div className="profile-page">
      <h2 className="page-title">Профиль</h2>

      <div className="profile-card">
        <div className="profile-avatar">
          {user?.photo_url ? (
            <img src={user.photo_url} alt={userName} />
          ) : (
            <span>{userInitial}</span>
          )}
        </div>
        <div className="profile-info">
          <h3>{userName}</h3>
          <p className="profile-id">
            {[draft.age && `${draft.age} лет`, draft.city].filter(Boolean).join(' · ') ||
              (user?.id ? `ID: ${user.id}` : 'Гость')}
          </p>
          <p className="profile-username">
            {user?.username ? `@${user.username}` : ''}
          </p>
        </div>
        <button
          className="profile-edit-btn"
          onClick={() => setIsEditing((value) => !value)}
        >
          {isEditing ? 'Отмена' : 'Изменить'}
        </button>
      </div>

      {isEditing ? (
        <form className="profile-section profile-edit-form" onSubmit={handleSubmit}>
          <h4>О себе</h4>

          <label>
            Возраст
            <input
              type="number"
              min="14"
              max="120"
              value={draft.age || ''}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  age: e.target.value ? Number(e.target.value) : '',
                }))
              }
              placeholder="Например, 24"
            />
          </label>

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

          <label>
            О себе
            <textarea
              rows="4"
              maxLength="500"
              value={draft.about || ''}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, about: e.target.value }))
              }
              placeholder="Расскажите, чем любите заниматься"
            />
          </label>

          <label>
            Ссылка на профиль в MAX
            <input
              type="text"
              value={draft.maxLink || ''}
              onChange={(e) => {
                setDraft((prev) => ({ ...prev, maxLink: e.target.value }));
                setMaxLinkError('');
              }}
              placeholder="Вставьте скопированный текст из MAX"
              aria-describedby="profile-max-link-hint"
            />
            <small id="profile-max-link-hint" className="profile-link-hint">
              Вставьте текст приглашения из MAX — ссылка на профиль сохранится автоматически.
            </small>
            {maxLinkError && <small className="error-text">{maxLinkError}</small>}
          </label>

          <button className="primary-btn" type="submit">
            Сохранить профиль
          </button>
        </form>
      ) : draft.about ? (
        <section className="profile-section profile-about">
          <h4>О себе</h4>
          <p>{draft.about}</p>
        </section>
      ) : null}

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
          <div className="stat-value">{friendsCount}</div>
          <div className="stat-label">Друзей</div>
        </div>
      </div>

      <div className="profile-section">
        <h4>Общение</h4>
        <button
          className="settings-row-button"
          type="button"
          onClick={() => onOpenFriends?.()}
        >
          <span>
            <Icon name="people" size={19} /> Друзья
            {incomingRequestsCount > 0 && (
              <span className="settings-badge">{incomingRequestsCount}</span>
            )}
          </span>
          <span>▶</span>
        </button>
      </div>

      <div className="profile-section">
        <h4>Настройки</h4>

        <div className="settings-row">
          <span>
            <Icon name="calendar" size={19} /> Уведомления о событиях
          </span>
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
          <span>
            <Icon name="grid" size={19} /> Тёмная тема
          </span>
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
        <button
          className="settings-row-button"
          onClick={() => setShowAbout(!showAbout)}
        >
          <span>О Вместе</span>
          <span>{showAbout ? '▼' : '▶'}</span>
        </button>
        {showAbout && (
          <div className="about-text">
            <p>
              <strong>Вместе</strong> — сервис для поиска и создания досуговых
              событий: спорт, настолки, культура, кино.
            </p>
            <p>Версия: 1.0.0 (MVP)</p>
            <p>
              Разработчик: команда <strong>нейтральное название</strong>
            </p>
            <p>Обработка данных: 152-ФЗ</p>
            <p>Модерация контента: активна</p>
          </div>
        )}
      </div>

      <div className="profile-section">
        <button
          className="settings-row-button"
          type="button"
          onClick={() => setLegalPage('privacy')}
        >
          <span>Политика конфиденциальности</span>
          <span>▶</span>
        </button>
        <button
          className="settings-row-button"
          type="button"
          onClick={() => setLegalPage('terms')}
        >
          <span>Пользовательское соглашение</span>
          <span>▶</span>
        </button>
      </div>

      {legalPage && (
        <LegalDocument
          type={legalPage}
          onClose={() => setLegalPage(null)}
          onSwitch={setLegalPage}
        />
      )}

      <p className="profile-footer">
        © 2026 Вместе · Команда <strong>нейтральное название</strong>
      </p>
    </div>
  );
};

export default Profile;