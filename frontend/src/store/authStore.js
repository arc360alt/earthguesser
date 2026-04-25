import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../utils/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      bonuses: [],

      setAuth: (token, user) => set({ token, user }),

      logout: () => {
        set({ user: null, token: null, bonuses: [] });
      },

      refreshUser: async () => {
        const { token } = get();
        if (!token) return;
        try {
          const res = await api.get('/auth/me');
          set({ user: res.data.user, bonuses: res.data.bonuses });
        } catch {
          set({ user: null, token: null, bonuses: [] });
        }
      },

      updatePoints: (points) =>
        set((state) => ({ user: state.user ? { ...state.user, points } : null })),
    }),
    { name: 'earthguesser-auth', partialize: (s) => ({ token: s.token, user: s.user }) }
  )
);

export default useAuthStore;
