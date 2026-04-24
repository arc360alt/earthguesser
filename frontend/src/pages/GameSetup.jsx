import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const REGIONS = [
  { id: 'world', label: '🌍 World', desc: 'Anywhere on Earth' },
  { id: 'europe', label: '🏰 Europe', desc: 'EU countries' },
  { id: 'north_america', label: '🗽 North America', desc: 'USA, Canada, Mexico' },
  { id: 'south_america', label: '🌿 South America', desc: 'Brazil, Argentina & more' },
  { id: 'asia', label: '🏯 Asia', desc: 'East, South & SE Asia' },
  { id: 'africa', label: '🦁 Africa', desc: 'Across the continent' },
  { id: 'oceania', label: '🦘 Oceania', desc: 'Australia, NZ & Pacific' },
];

const MODES = [
  { id: 'standard', label: 'Standard', desc: 'Move, pan & zoom freely' },
  { id: 'nopan', label: 'No Move', desc: 'Stuck at the starting point — harder!' },
  { id: 'notime', label: 'No Timer', desc: 'Take as long as you need' },
];

const TIME_OPTIONS = [30, 60, 120, 180, 300];
const ROUND_OPTIONS = [1, 3, 5, 10];

export default function GameSetup() {
  const navigate = useNavigate();
  const { bonuses } = useAuth();
  const [region, setRegion] = useState('world');
  const [mode, setMode] = useState('standard');
  const [rounds, setRounds] = useState(5);
  const [timeLimit, setTimeLimit] = useState(120);
  const [noRandomLocations, setNoRandomLocations] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeBonus = bonuses?.[0];

  async function startGame() {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/game/create', {
        region,
        rounds,
        timeLimit,
        mode,
        noRandomLocations,
      });
      navigate(`/game/${res.data.gameId}`, { state: { gameData: res.data } });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create game. Check your API keys.');
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Quick Play</h1>
        <p className="text-white/50 mb-8 text-sm">Customise your game and start exploring.</p>

        {activeBonus && (
          <div className="mb-6 bg-brand-green/10 border border-brand-green/30 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="text-brand-green font-semibold text-sm">Active bonus: {activeBonus.bonus_type.replace(/_/g, ' ')}</p>
              <p className="text-white/50 text-xs">This will be applied to your next game automatically.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-brand-accent/20 border border-brand-accent/40 text-brand-accent text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Region */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Region</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {REGIONS.map((r) => (
              <button
                key={r.id}
                onClick={() => setRegion(r.id)}
                className={`text-left px-4 py-3 rounded-xl border transition-all ${
                  region === r.id
                    ? 'border-brand-green bg-brand-green/10 text-white'
                    : 'border-white/10 bg-brand-panel text-white/70 hover:border-white/30 hover:text-white'
                }`}
              >
                <div className="font-medium text-sm">{r.label}</div>
                <div className="text-xs text-white/40 mt-0.5">{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Game Mode */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Game Mode</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`text-left px-4 py-3 rounded-xl border transition-all ${
                  mode === m.id
                    ? 'border-brand-green bg-brand-green/10 text-white'
                    : 'border-white/10 bg-brand-panel text-white/70 hover:border-white/30 hover:text-white'
                }`}
              >
                <div className="font-medium text-sm">{m.label}</div>
                <div className="text-xs text-white/40 mt-0.5">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Rounds */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">
            Rounds
          </h2>
          <div className="flex gap-2">
            {ROUND_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRounds(r)}
                className={`flex-1 py-2.5 rounded-xl border font-semibold text-sm transition-all ${
                  rounds === r
                    ? 'border-brand-green bg-brand-green/10 text-white'
                    : 'border-white/10 bg-brand-panel text-white/70 hover:border-white/30'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Time Limit */}
        {mode !== 'notime' && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">
              Time per Round
            </h2>
            <div className="flex gap-2">
              {TIME_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeLimit(t)}
                  className={`flex-1 py-2.5 rounded-xl border font-semibold text-sm transition-all ${
                    timeLimit === t
                      ? 'border-brand-green bg-brand-green/10 text-white'
                      : 'border-white/10 bg-brand-panel text-white/70 hover:border-white/30'
                  }`}
                >
                  {t < 60 ? `${t}s` : `${t / 60}m`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No Completely Random Locations */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">
            Location Options
          </h2>
          <button
            onClick={() => setNoRandomLocations(!noRandomLocations)}
            className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
              noRandomLocations
                ? 'border-brand-green bg-brand-green/10 text-white'
                : 'border-white/10 bg-brand-panel text-white/70 hover:border-white/30 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">Near Cities & Towns</div>
                <div className="text-xs text-white/40 mt-0.5">Only pick locations within 3 miles of a village or city</div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                noRandomLocations ? 'border-brand-green bg-brand-green' : 'border-white/30'
              }`}>
                {noRandomLocations && (
                  <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          </button>
        </div>

        {/* Summary & Start */}
        <div className="flex items-center justify-between bg-brand-panel border border-white/10 rounded-xl px-5 py-4">
          <div className="text-sm text-white/50">
            <span className="text-white font-medium">{rounds} rounds</span>
            {' · '}
            <span className="text-white font-medium">
              {mode === 'notime' ? 'No timer' : `${timeLimit < 60 ? `${timeLimit}s` : `${timeLimit / 60}m`} each`}
            </span>
            {' · '}
            <span className="text-white font-medium">
              {REGIONS.find((r) => r.id === region)?.label}
            </span>
          </div>
          <button
            onClick={startGame}
            disabled={loading}
            className="btn-primary ml-4 whitespace-nowrap"
          >
            {loading ? 'Finding locations...' : 'Start Game →'}
          </button>
        </div>
      </div>
    </div>
  );
}
