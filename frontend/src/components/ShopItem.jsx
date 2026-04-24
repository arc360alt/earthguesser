import React from 'react';

const ICONS = {
  clock: '⏱️',
  zap: '⚡',
  map: '🗺️',
  shield: '🛡️',
  crosshair: '🎯',
};

export default function ShopItem({ item, userPoints, owned, onBuy, buying }) {
  const canAfford = userPoints >= item.cost;
  const icon = ICONS[item.icon] || '🎁';

  return (
    <div className={`card flex flex-col gap-3 ${owned ? 'border-brand-green/40' : ''}`}>
      <div className="flex items-start justify-between">
        <span className="text-3xl">{icon}</span>
        {owned && (
          <span className="text-xs font-semibold bg-brand-green/20 text-brand-green px-2 py-0.5 rounded-full border border-brand-green/30">
            Owned
          </span>
        )}
      </div>
      <div>
        <h3 className="font-semibold text-white">{item.name}</h3>
        <p className="text-sm text-white/60 mt-1">{item.description}</p>
      </div>
      <div className="mt-auto flex items-center justify-between pt-2 border-t border-white/10">
        <span className="flex items-center gap-1 font-bold text-yellow-400">
          <span className="text-yellow-400">●</span>
          {item.cost.toLocaleString()} pts
        </span>
        <button
          onClick={() => onBuy(item.id)}
          disabled={!canAfford || owned || buying}
          className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors ${
            owned
              ? 'bg-white/5 text-white/30 cursor-not-allowed'
              : canAfford
              ? 'bg-brand-green hover:bg-green-600 text-white'
              : 'bg-white/5 text-white/30 cursor-not-allowed'
          }`}
        >
          {owned ? 'Owned' : buying ? 'Buying...' : canAfford ? 'Buy' : 'Not enough pts'}
        </button>
      </div>
    </div>
  );
}
