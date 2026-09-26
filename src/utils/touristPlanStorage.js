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

const normalizePlan = (plan) => {
  if (Array.isArray(plan?.options)) return plan;
  if (Array.isArray(plan?.events) && plan.events.length) {
    return {
      ...plan,
      options: [{ id: 'legacy-route', title: 'Сохранённый маршрут', events: plan.events, places: [] }],
      selectedOptionId: 'legacy-route',
    };
  }
  return plan;
};

export const touristPlanStorage = {
  getAll(userId) {
    const stored = readAll()[String(userId || 'anonymous')];
    return (Array.isArray(stored) ? stored : []).map(normalizePlan).filter(Boolean);
  },

  getLatest(userId) {
    return [...this.getAll(userId)].sort((left, right) => Date.parse(right.savedAt) - Date.parse(left.savedAt))[0] || null;
  },

  getForCity(userId, city) {
    return this.getAll(userId)
      .filter((plan) => String(plan.city).toLocaleLowerCase('ru-RU') === String(city).toLocaleLowerCase('ru-RU'))
      .sort((left, right) => Date.parse(right.savedAt) - Date.parse(left.savedAt))[0] || null;
  },

  save(userId, plan) {
    try {
      const all = readAll();
      const key = String(userId || 'anonymous');
      const plans = Array.isArray(all[key]) ? all[key] : [];
      const savedPlan = normalizePlan({ ...plan, savedAt: plan.savedAt || new Date().toISOString() });
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

  mergeFromServer(userId, serverPlans) {
    try {
      const localPlans = this.getAll(userId);
      const merged = new Map(localPlans.map((plan) => [`${plan.city}:${plan.date}`, plan]));
      for (const plan of serverPlans || []) {
        merged.set(`${plan.city}:${plan.date}`, { ...normalizePlan(plan), storage: 'server' });
      }
      const all = readAll();
      const key = String(userId || 'anonymous');
      all[key] = [...merged.values()]
        .sort((left, right) => Date.parse(right.savedAt) - Date.parse(left.savedAt))
        .slice(0, MAX_PLANS_PER_USER);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      return all[key];
    } catch {
      return this.getAll(userId);
    }
  },
};
