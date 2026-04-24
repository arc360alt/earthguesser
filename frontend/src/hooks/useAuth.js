import { useEffect } from 'react';
import useAuthStore from '../store/authStore';

export function useAuth() {
  const { user, token, bonuses, logout, refreshUser, setAuth, updatePoints } = useAuthStore();

  useEffect(() => {
    if (token && !user) refreshUser();
  }, [token]);

  return { user, token, bonuses, isLoggedIn: !!token, logout, refreshUser, setAuth, updatePoints };
}
