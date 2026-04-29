import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import useSettingsStore from '../store/settingsStore';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

export default function Settings() {
  const { units, setUnits, showOnLeaderboard, setShowOnLeaderboard } = useSettingsStore();
  const { isLoggedIn, user, refreshUser } = useAuth();

  // Sync backend setting when user logs in/out
  useEffect(() => {
    if (isLoggedIn && user) {
      setShowOnLeaderboard(user.show_on_leaderboard !== 0);
    }
  }, [isLoggedIn, user?.show_on_leaderboard]);

  const toggleLeaderboard = async () => {
    const newValue = !showOnLeaderboard;
    setShowOnLeaderboard(newValue);
    if (isLoggedIn) {
      try {
        await api.put('/auth/settings', { show_on_leaderboard: newValue });
        refreshUser();
      } catch (err) {
        console.error('Failed to update leaderboard setting', err);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-8">
      <Link to="/" className="text-white/50 hover:text-white text-sm mb-6 inline-block">
        ← Back to Home
      </Link>

      <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

      <div className="bg-brand-panel border border-white/10 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Display</h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">Distance Units</p>
            <p className="text-white/50 text-sm mt-0.5">Choose how distances are displayed</p>
          </div>
          <div className="flex bg-brand-dark rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setUnits('km')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                units === 'km'
                  ? 'bg-brand-green text-brand-dark'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Kilometers
            </button>
            <button
              onClick={() => setUnits('mi')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                units === 'mi'
                  ? 'bg-brand-green text-brand-dark'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Miles
            </button>
          </div>
        </div>
      </div>

      <div className="bg-brand-panel border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Privacy</h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">Show on Leaderboards</p>
            <p className="text-white/50 text-sm mt-0.5">Allow your scores to appear on public leaderboards</p>
          </div>
          <button
            onClick={toggleLeaderboard}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              showOnLeaderboard ? 'bg-brand-green' : 'bg-gray-600'
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                showOnLeaderboard ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
