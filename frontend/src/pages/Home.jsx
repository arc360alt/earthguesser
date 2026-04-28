import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

export default function Home() {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [dailyInfo, setDailyInfo] = useState(null);
  const [commitHash, setCommitHash] = useState('');

  useEffect(() => {
    api.get('/daily').then((r) => setDailyInfo(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    fetch('https://api.github.com/repos/arc360alt/earthguesser/commits')
      .then((r) => r.json())
      .then((data) => setCommitHash(data[0]?.sha?.slice(0, 7) || ''))
      .catch(() => {});
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight">
          Earth<span className="text-brand-green">Guesser</span>
        </h1>
        <p className="text-white/60 text-lg max-w-md mb-10">
          Drop into a random location anywhere on Earth. Explore, find clues, and guess where you are.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          {/* Daily Challenge */}
          <Link
            to="/daily"
            className="flex-1 flex flex-col items-center gap-1 bg-brand-green hover:bg-green-600 text-white font-semibold px-6 py-4 rounded-xl transition-colors pulse-green"
          >
            <span className="text-2xl">📅</span>
            <span>Daily Challenge</span>
            {dailyInfo?.completed && (
              <span className="text-xs text-green-200">✓ Completed today</span>
            )}
          </Link>

          {/* Quick Play */}
          <Link
            to="/play"
            className="flex-1 flex flex-col items-center gap-1 bg-brand-card hover:bg-blue-900 text-white font-semibold px-6 py-4 rounded-xl border border-white/10 transition-colors"
          >
            <span className="text-2xl">🎮</span>
            <span>Quick Play</span>
            <span className="text-xs text-white/50">Customise your game</span>
          </Link>
        </div>
      </div>

      {/* Stats / Features */}
      <div className="bg-brand-panel border-t border-white/10 px-4 py-10">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl mb-2">🌍</div>
            <h3 className="font-semibold mb-1">Explore the World</h3>
            <p className="text-sm text-white/50">Real Google Street View locations from every corner of the globe.</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">📅</div>
            <h3 className="font-semibold mb-1">Daily Challenges</h3>
            <p className="text-sm text-white/50">A new 5-round challenge every day. Keep your streak alive!</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">🏆</div>
            <h3 className="font-semibold mb-1">Points & Bonuses</h3>
            <p className="text-sm text-white/50">Earn points, buy power-ups, and climb the leaderboard.</p>
          </div>
        </div>

        {!isLoggedIn && (
          <div className="mt-8 text-center">
            <p className="text-white/50 text-sm mb-3">Sign up to save your scores and streaks</p>
            <div className="flex items-center justify-center gap-3">
              <Link to="/register" className="btn-primary">Create Account</Link>
              <Link to="/login" className="btn-secondary">Login</Link>
            </div>
          </div>
        )}

        {isLoggedIn && user && (
          <div className="mt-8 max-w-md mx-auto card text-center">
            <p className="text-white/50 text-sm">Welcome back,</p>
            <p className="text-xl font-bold">{user.username}</p>
            <div className="flex items-center justify-center gap-6 mt-3 text-sm">
              <div>
                <p className="text-yellow-400 font-bold">{user.points?.toLocaleString()}</p>
                <p className="text-white/50">Points</p>
              </div>
              <div>
                <p className="text-brand-green font-bold">{user.daily_streak ?? 0} 🔥</p>
                <p className="text-white/50">Streak</p>
              </div>
              <div>
                <p className="text-white font-bold">{user.best_score?.toLocaleString()}</p>
                <p className="text-white/50">Best score</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-brand-panel border-t border-white/10 px-4 py-3 flex items-center justify-between text-xs text-white/40">
        <div className="flex items-center gap-2">
          <span>EarthGuesser</span>
          <span>·</span>
          <span>A geoguesser alternative coded in a weekend.</span>
        </div>
        <span>{commitHash && `Build ${commitHash}`}</span>
      </footer>
    </div>
  );
}
