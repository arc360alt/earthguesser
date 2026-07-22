import React, { useEffect, useState } from 'react';

export default function AchievementToast({ achievements = [] }) {
  const [visible, setVisible] = useState([]);

  useEffect(() => {
    if (!achievements.length) return;
    setVisible(achievements);
    const timeout = setTimeout(() => setVisible([]), 6000);
    return () => clearTimeout(timeout);
  }, [achievements]);

  if (visible.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-xs">
      {visible.map((a) => (
        <div
          key={a.id}
          className="bg-brand-panel border border-brand-green/40 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 toast-in"
        >
          <span className="text-2xl">{a.icon}</span>
          <div>
            <p className="text-brand-green text-xs font-semibold uppercase tracking-wide">Achievement unlocked</p>
            <p className="text-white font-bold text-sm">{a.name}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
