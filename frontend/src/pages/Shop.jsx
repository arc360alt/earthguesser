import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import ShopItem from '../components/ShopItem';
import { useAuth } from '../hooks/useAuth';

export default function Shop() {
  const { user, isLoggedIn, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [ownedBonuses, setOwnedBonuses] = useState([]);
  const [buying, setBuying] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    fetchShop();
  }, []);

  async function fetchShop() {
    try {
      const res = await api.get('/shop');
      setItems(res.data.items);
      setUserPoints(res.data.userPoints);
      setOwnedBonuses(res.data.ownedBonuses);
    } catch {}
    setLoading(false);
  }

  async function handleBuy(itemId) {
    setBuying(itemId);
    setMessage(null);
    try {
      const res = await api.post('/shop/buy', { itemId });
      setUserPoints(res.data.newPoints);
      setOwnedBonuses((prev) => [...prev, res.data.bonus.type]);
      setMessage({ type: 'success', text: 'Bonus purchased! It will activate in your next game.' });
      refreshUser();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Purchase failed' });
    } finally {
      setBuying(null);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-4xl animate-bounce">🏪</div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 py-10 max-w-3xl mx-auto w-full">
      <div className="mb-4 rounded-lg bg-red-500/20 border border-red-500/40 px-4 py-3 text-m text-red-200">
        ⚠️ Work in progress, most of these items don't work yet!!
      </div>

      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold">Bonus Shop</h1>
        <div className="flex items-center gap-2 bg-brand-panel border border-white/10 rounded-xl px-4 py-2">
          <span className="text-yellow-400 text-lg">●</span>
          <span className="font-bold text-lg">{userPoints.toLocaleString()}</span>
          <span className="text-white/50 text-sm">points</span>
        </div>
      </div>
      <p className="text-white/50 text-sm mb-6">Earn points by playing games. Spend them on bonuses that activate in your next game.</p>

      {message && (
        <div className={`mb-6 rounded-xl px-4 py-3 text-sm border ${
          message.type === 'success'
            ? 'bg-brand-green/10 border-brand-green/30 text-brand-green'
            : 'bg-brand-accent/20 border-brand-accent/40 text-brand-accent'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((item) => (
          <ShopItem
            key={item.id}
            item={item}
            userPoints={userPoints}
            owned={ownedBonuses.includes(item.bonus_type)}
            onBuy={handleBuy}
            buying={buying === item.id}
          />
        ))}
      </div>

      <div className="mt-8 card text-sm text-white/50">
        <h3 className="font-semibold text-white mb-2">How to earn points</h3>
        <ul className="flex flex-col gap-1.5">
          <li>● Complete a Quick Play game — up to 100 pts based on your score</li>
          <li>● Complete the Daily Challenge — up to 100 pts + streak bonus</li>
          <li>● Each bonus is used automatically when you start your next game</li>
        </ul>
      </div>
    </div>
  );
}
