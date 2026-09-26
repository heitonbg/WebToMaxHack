const STORAGE_KEY = 'max_events_tourist_plans_v1';
const MAX_PLANS_PER_USER = 20;

const readAll = () => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
};

export const touristPlanStorage = {
  getLatest(userId) {
    const stored = readAll()[String(userId || 'anonymous')];
    const plans = Array.isArray(stored) ? stored : [];
    return [...plans].sort((left, right) => Date.parse(right.savedAt) - Date.parse(left.savedAt))[0] || null;
  },

  getForCity(userId, city) {
    const stored = readAll()[String(userId || 'anonymous')];
    const plans = Array.isArray(stored) ? stored : [];
    return plans
      .filter((plan) => String(plan.city).toLocaleLowerCase('ru-RU') === String(city).toLocaleLowerCase('ru-RU'))
      .sort((left, right) => Date.parse(right.savedAt) - Date.parse(left.savedAt))[0] || null;
  },

  save(userId, plan) {
    try {
      const all = readAll();
      const key = String(userId || 'anonymous');
      const plans = Array.isArray(all[key]) ? all[key] : [];
      const savedPlan = { ...plan, savedAt: new Date().toISOString() };
      const planKey = `${savedPlan.city}:${savedPlan.date}`;
      all[key] = [
        savedPlan,
        ...plans.filter((item) => `${item.city}:${item.date}` !== planKey),
      ].slice(0, MAX_PLANS_PER_USER);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      return savedPlan;
    } catch {
      return null;
    }
  },
};
