const KEY = 'max_events_city_v1';

const read = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const write = (city) => {
  try { localStorage.setItem(KEY, JSON.stringify(city)); } catch {}
};

export const cityStorage = {
  get: () => read(),
  set: (city) => write(city),
  clear: () => { try { localStorage.removeItem(KEY); } catch {} }
};