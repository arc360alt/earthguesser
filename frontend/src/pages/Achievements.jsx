import React, { useEffect, useState } from 'react';
import api from '../utils/api';

const TIER_COLOR = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
};

export default function Achievements() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/achievements').then((r) => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-4xl animate-bounce">🏆</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex-1 px-4 py-10 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold">Achievements</h1>
        <span className="text-white/50 text-sm">{data.unlockedCount} / {data.totalCount} unlocked</span>
      </div>
      <p className="text-white/50 text-sm mb-6">Earned by playing Quick Play, Daily Challenge, and Duels.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.achievements.map((a) => (
          <div
            key={a.id}
            className={`card flex items-center gap-4 transition-opacity ${a.unlocked ? '' : 'opacity-40'}`}
            style={{ borderColor: a.unlocked ? TIER_COLOR[a.tier] || undefined : undefined }}
          >
            <span className={`text-3xl ${a.unlocked ? '' : 'grayscale'}`}>{a.icon}</span>
            <div className="flex-1">
              <p className="font-semibold text-sm">{a.name}</p>
              <p className="text-white/40 text-xs mt-0.5">{a.description}</p>
              {a.unlocked && a.unlockedAt && (
                <p className="text-brand-green text-xs mt-1">
                  Unlocked {new Date(a.unlockedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
