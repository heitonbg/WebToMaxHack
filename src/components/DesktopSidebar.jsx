import React from 'react';
import Icon from './Icon';

const DesktopSidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'feed', icon: 'home', label: 'Главная' },
    { id: 'map', icon: 'map', label: 'Карта' },
    { id: 'create', icon: 'plus', label: 'Создать событие' },
    { id: 'my', icon: 'user', label: 'Мои события' },
    { id: 'profile', icon: 'grid', label: 'Профиль' }
  ];

  return (
    <aside className="desktop-sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">N</div>
        <div className="sidebar-logo-text">
          <h2>MAX Events</h2>
          <span className="sidebar-logo-team">команда neutralname</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
          >
            <span className="sidebar-icon"><Icon name={item.icon} size={20} /></span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p>© 2026 MAX Events</p>
        <p className="sidebar-hint">События рядом с вами</p>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
