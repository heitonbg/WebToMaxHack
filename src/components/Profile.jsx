import React, { useState } from 'react';
import Icon from './Icon';

const Profile = ({
  user, joinedIds, createdCount,
  notificationsOn, onToggleNotifications,
  theme, onToggleTheme,
  onLogout
}) => {
  const [showAbout, setShowAbout] = useState(false);

  const userName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : 'Гость';

  const userInitial = userName.charAt(0).toUpperCase();
  const isDark = theme === 'dark';

  return (
    <div className="profile-page">
      <h2 className="page-title">Профиль</h2>

      <div className="profile-card">
        <div className="profile-avatar">
          {user?.photo_url ? <img src={user.photo_url} alt={userName} /> : <span>{userInitial}</span>}
        </div>
        <div className="profile-info">
          <h3>{userName}</h3>
          <p className="profile-id">{user?.id ? `ID: ${user.id}` : 'Гость'}</p>
          <p className="profile-username">{user?.username ? `@${user.username}` : ''}</p>
        </div>
      </div>

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
          <span><Icon name="pin" size={19} /> Показывать мой район</span>
          <label className="switch"><input type="checkbox" defaultChecked /><span className="slider"></span></label>
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
        <button className="settings-row-button"><span>Политика конфиденциальности</span><span>▶</span></button>
        <button className="settings-row-button"><span>Пользовательское соглашение</span><span>▶</span></button>
      </div>

      <button className="logout-btn" onClick={onLogout}>Выйти</button>
      <p className="profile-footer">© 2026 MAX Events · Команда <strong>neutralname</strong></p>
    </div>
  );
};

export default Profile;