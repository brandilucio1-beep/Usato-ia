const API_BASE = '/api';

async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Errore di rete');
  }
  return res.json();
}

export const api = {
  // Phones
  getPhones: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/phones${qs ? '?' + qs : ''}`);
  },
  getPhone: (id) => apiFetch(`/phones/${id}`),
  getPhoneListings: (id, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/phones/${id}/listings${qs ? '?' + qs : ''}`);
  },

  // Trends
  getTrends: () => apiFetch('/trends'),

  // Regions
  getRegions: () => apiFetch('/regions'),

  // Favorites
  getFavorites: () => apiFetch('/favorites'),
  addFavorite: (phoneId) => apiFetch(`/favorites/${phoneId}`, { method: 'POST', body: '{}' }),
  removeFavorite: (phoneId) => apiFetch(`/favorites/${phoneId}`, { method: 'DELETE' }),

  // AI Analysis
  analyzePhone: (phoneId) => apiFetch(`/analyze/${phoneId}`, { method: 'POST', body: '{}' }),

  // Status
  getStatus: () => apiFetch('/status'),

  // Admin
  triggerScrape: () => apiFetch('/admin/scrape', { method: 'POST', body: '{}' }),
};
