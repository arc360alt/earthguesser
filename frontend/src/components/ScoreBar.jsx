import React from 'react';
import { scoreColor, scoreLabel } from '../utils/geo';

export default function ScoreBar({ score, maxScore = 5000 }) {
  const pct = Math.round((score / maxScore) * 100);
  const color = scoreColor(score);

  return (
    <div className="w-full">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm font-medium text-white/70">{scoreLabel(score)}</span>
        <span className="text-lg font-bold" style={{ color }}>{score.toLocaleString()} pts</span>
      </div>
      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full score-fill"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
