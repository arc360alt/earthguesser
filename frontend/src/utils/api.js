import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://egapi.arc360hub.com/api',
});

// Attach JWT token from localStorage via zustand persist
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('earthguesser-auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      const token = parsed?.state?.token;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {}
  return config;
});

export default api;
