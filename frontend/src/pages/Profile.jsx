import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

export default function Profile() {
  const { user, isLoggedIn, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [dailyLeaderboard, setDailyLeaderboard] = useState([]);
  const [tab, setTab] = useState('alltime');

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    refreshUser();
    api.get('/leaderboard/alltime').then((r) => setLeaderboard(r.data.leaderboard)).catch(() => {});
    api.get('/leaderboard/daily').then((r) => setDailyLeaderboard(r.data.leaderboard)).catch(() => {});
  }, []);

  if (!user) return null;

  const board = tab === 'alltime' ? leaderboard : dailyLeaderboard;

  return (
    <div className="flex-1 px-4 py-10 max-w-3xl mx-auto w-full">
      {/* User card */}
      <div className="card mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-20 h-20 rounded-full bg-brand-card border-2 border-brand-green flex items-center justify-center text-3xl font-bold text-brand-green flex-shrink-0">
          {user.username?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-bold">{user.username}</h1>
          <p className="text-white/40 text-sm">Member since {new Date(user.created_at).toLocaleDateString()}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {[
              { label: 'Points', value: user.points?.toLocaleString(), color: 'text-yellow-400' },
              { label: 'Best Score', value: user.best_score?.toLocaleString(), color: 'text-brand-green' },
              { label: 'Games', value: user.total_games, color: 'text-white' },
              { label: 'Streak 🔥', value: `${user.daily_streak ?? 0}d`, color: 'text-orange-400' },
            ].map((stat) => (
              <div key={stat.label} className="bg-brand-dark rounded-xl px-3 py-2 text-center border border-white/10">
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value ?? 0}</p>
                <p className="text-white/40 text-xs">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Leaderboard</h2>
          <div className="flex gap-1 bg-brand-dark rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setTab('alltime')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${tab === 'alltime' ? 'bg-brand-green text-white' : 'text-white/50 hover:text-white'}`}
            >
              All Time
            </button>
            <button
              onClick={() => setTab('daily')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${tab === 'daily' ? 'bg-brand-green text-white' : 'text-white/50 hover:text-white'}`}
            >
              Today
            </button>
          </div>
        </div>

        {board.length === 0 ? (
          <p className="text-white/40 text-sm text-center py-6">No scores yet. Be the first!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {board.map((entry, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                  entry.username === user.username ? 'bg-brand-green/10 border border-brand-green/30' : 'bg-brand-dark border border-white/5'
                }`}
              >
                <span className={`w-6 text-center font-bold text-sm ${
                  i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-white/40'
                }`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </span>
                <span className="flex-1 font-medium text-sm">{entry.username}</span>
                {tab === 'alltime' && (
                  <span className="text-xs text-white/40">{entry.total_games} games</span>
                )}
                <span className="font-bold text-brand-green text-sm">
                  {(tab === 'alltime' ? entry.best_score : entry.total_score)?.toLocaleString()} pts
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
