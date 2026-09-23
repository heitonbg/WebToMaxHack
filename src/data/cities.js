// Города, поддерживаемые KudaGo API
// slug — используется в запросах KudaGo
export const CITIES = [
  { slug: 'msk', name: 'Москва', lat: 55.7558, lng: 37.6176 },
  { slug: 'spb', name: 'Санкт-Петербург', lat: 59.9343, lng: 30.3351 },
  { slug: 'kzn', name: 'Казань', lat: 55.796, lng: 49.108 },
  { slug: 'nsk', name: 'Новосибирск', lat: 55.0084, lng: 82.9357 },
  { slug: 'ekb', name: 'Екатеринбург', lat: 56.8389, lng: 60.6057 },
  { slug: 'nnv', name: 'Нижний Новгород', lat: 56.3269, lng: 44.0059 },
  { slug: 'sam', name: 'Самара', lat: 53.1958, lng: 50.1002 },
  { slug: 'krd', name: 'Краснодар', lat: 45.0355, lng: 38.9753 },
  { slug: 'sochi', name: 'Сочи', lat: 43.6028, lng: 39.7342 },
  { slug: 'ufa', name: 'Уфа', lat: 54.7388, lng: 55.9721 },
  { slug: 'kras', name: 'Красноярск', lat: 56.0153, lng: 92.8932 },
  { slug: 'vbg', name: 'Владивосток', lat: 43.1155, lng: 131.8855 },
  { slug: 'perm', name: 'Пермь', lat: 58.0105, lng: 56.2502 },
  { slug: 'vrn', name: 'Воронеж', lat: 51.6720, lng: 39.1843 },
  { slug: 'sar', name: 'Саратов', lat: 51.5336, lng: 46.0343 },
  { slug: 'tmn', name: 'Тюмень', lat: 57.1522, lng: 65.5272 },
  { slug: 'izh', name: 'Ижевск', lat: 56.8527, lng: 53.2115 },
  { slug: 'vol', name: 'Волгоград', lat: 48.7080, lng: 44.5133 },
  { slug: 'rostov', name: 'Ростов-на-Дону', lat: 47.2225, lng: 39.7187 },
  { slug: 'chel', name: 'Челябинск', lat: 55.1644, lng: 61.4368 }
];

export const DEFAULT_CITY = 'kzn';

export const findCityBySlug = (slug) => CITIES.find((c) => c.slug === slug);

export const findCityByName = (name) => CITIES.find((c) => c.name === name);