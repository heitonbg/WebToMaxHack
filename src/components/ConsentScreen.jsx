import React from 'react';
import Icon from './Icon';

const ConsentScreen = ({ onAccept }) => {
  return (
    <div className="consent-screen">
      <div className="consent-icon"><Icon name="map" size={58} /></div>
      <h1>MAX Events</h1>
      <p className="consent-subtitle">
        Делитесь идеями. Собирайте людей. Делайте город ярче!
      </p>

      <div className="consent-card">
        <h3>Согласие на обработку данных</h3>
        <p>
          Для работы приложения мы обрабатываем: имя, аватар и приблизительную
          геолокацию. Данные используются только для организации досуга и
          не передаются третьим лицам.
        </p>
        <ul>
          <li>✅ Точный адрес виден только участникам</li>
          <li>✅ Модерация всех событий</li>
          <li>✅ Возможность удалить данные в любой момент</li>
        </ul>
      </div>

      <button className="primary-btn" onClick={onAccept}>
        Согласен и продолжить
      </button>
      <p className="consent-note">
        Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности (152-ФЗ)
      </p>
    </div>
  );
};

export default ConsentScreen;
