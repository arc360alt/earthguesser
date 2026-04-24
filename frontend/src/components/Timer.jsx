import React from 'react';

export default function Timer({ timeLeft, totalTime }) {
  const pct = totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;
  const isUrgent = timeLeft <= 15;

  return (
    <div className="flex flex-col items-center gap-1 min-w-[80px]">
      <span
        className={`text-2xl font-bold tabular-nums ${isUrgent ? 'text-brand-accent animate-pulse' : 'text-white'}`}
      >
        {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:
        {String(timeLeft % 60).padStart(2, '0')}
      </span>
      <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full score-fill ${isUrgent ? 'bg-brand-accent' : 'bg-brand-green'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
