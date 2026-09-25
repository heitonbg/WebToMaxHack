// Демонстрационные профили используются только в mock-режиме. Реальный API
// должен возвращать их по /api/events/:id/participants.
export const DEMO_PARTICIPANTS = [
  { id: 'member-anna', name: 'Анна', age: 24, city: 'Казань', about: 'Люблю прогулки, кино и знакомиться с новыми людьми.', eventIds: [1, 4, 7] },
  { id: 'member-ivan', name: 'Иван', age: 28, city: 'Казань', about: 'Бегаю по утрам и иногда играю в настолки.', eventIds: [1, 2, 5] },
  { id: 'member-dasha', name: 'Дарья', age: 22, city: 'Казань', about: 'Студентка, хожу на лекции и городские события.', eventIds: [1, 3, 10] },
  { id: 'member-maxim', name: 'Максим', age: 30, city: 'Казань', about: 'Музыкант. Всегда рад хорошей компании.', eventIds: [2, 8, 9] },
  { id: 'member-sofia', name: 'София', age: 26, city: 'Казань', about: 'Йога, выставки и новые маршруты по городу.', eventIds: [3, 7, 9] },
];

const BY_EVENT = {
  1: ['member-anna', 'member-ivan', 'member-dasha'],
  2: ['member-ivan', 'member-maxim'],
  3: ['member-dasha', 'member-sofia'],
  4: ['member-anna', 'member-dasha'],
  5: ['member-ivan'],
  7: ['member-anna', 'member-sofia'],
  8: ['member-maxim'],
  9: ['member-maxim', 'member-sofia'],
  10: ['member-dasha'],
};

export const getDemoParticipants = (eventId) => {
  const ids = BY_EVENT[eventId] || [];
  return ids.map((id) => DEMO_PARTICIPANTS.find((person) => person.id === id)).filter(Boolean);
};
