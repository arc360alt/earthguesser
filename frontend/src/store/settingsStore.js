import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useSettingsStore = create(
  persist(
    (set) => ({
      units: 'km', // 'km' or 'mi'
      showOnLeaderboard: true,
      setUnits: (units) => set({ units }),
      setShowOnLeaderboard: (show) => set({ showOnLeaderboard: show }),
    }),
    { name: 'earthguesser-settings' }
  )
);

export default useSettingsStore;
