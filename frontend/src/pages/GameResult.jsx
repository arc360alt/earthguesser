import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import ScoreBar from '../components/ScoreBar';
import { formatDistance, scoreColor } from '../utils/geo';
import { useAuth } from '../hooks/useAuth';

export default function GameResult() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, refreshUser } = useAuth();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/game/${gameId}`)
      .then((r) => {
        const { game, rounds } = r.data;
        setResult({ game, rounds });
        if (isLoggedIn) refreshUser();
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-4xl animate-bounce">🌍</div>
      </div>
    );
  }

  if (!result) return null;

  const { game, rounds } = result;
  const maxScore = game.round_count * 5000;
  const pct = Math.round((game.total_score / maxScore) * 100);

  function medalEmoji(score, max) {
    const p = score / max;
    if (p >= 0.95) return '🥇';
    if (p >= 0.75) return '🥈';
    if (p >= 0.5) return '🥉';
    return '📍';
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">{medalEmoji(game.total_score, maxScore)}</div>
          <h1 className="text-3xl font-bold">Game Over</h1>
          <p className="text-white/50 text-sm mt-1 capitalize">
            {game.region.replace(/_/g, ' ')} · {game.round_count} rounds
          </p>
        </div>

        {/* Total score */}
        <div className="card mb-4 text-center">
          <p className="text-white/50 text-sm mb-1">Total Score</p>
          <p className="text-5xl font-bold" style={{ color: scoreColor(game.total_score) }}>
            {game.total_score.toLocaleString()}
          </p>
          <p className="text-white/40 text-sm">out of {maxScore.toLocaleString()} ({pct}%)</p>
          <div className="mt-4">
            <ScoreBar score={game.total_score} maxScore={maxScore} />
          </div>
        </div>

        {/* Round breakdown */}
        <div className="card mb-4">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
            Round Breakdown
          </h2>
          <div className="flex flex-col gap-3">
            {rounds.map((round) => (
              <div key={round.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand-card flex items-center justify-center text-xs font-bold border border-white/10">
                    {round.round_number}
                  </span>
                  <span className="text-sm text-white/60">
                    {round.distance_km != null
                      ? formatDistance(round.distance_km)
                      : 'No guess'}
                  </span>
                </div>
                <span className="font-bold text-sm" style={{ color: scoreColor(round.score) }}>
                  {round.score.toLocaleString()} pts
                </span>
              </div>
            ))}
          </div>
        </div>

        {!isLoggedIn && (
          <div className="card mb-4 text-center">
            <p className="text-white/50 text-sm mb-2">
              Want to save your scores and compete on the leaderboard?
            </p>
            <a href="/register" className="text-brand-green hover:underline text-sm font-semibold">
              Create a free account →
            </a>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => navigate('/')} className="btn-secondary flex-1">
            Home
          </button>
          <button onClick={() => navigate('/play')} className="btn-primary flex-1">
            Play Again →
          </button>
        </div>
      </div>
    </div>
  );
}
