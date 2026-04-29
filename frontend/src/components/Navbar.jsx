import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav className="bg-brand-panel border-b border-white/10 px-4 py-3 flex items-center justify-between z-50 relative">
      <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
        <img src="/icon.png" alt="EarthGuesser" className="w-8 h-8" />
        <span>Earth<span className="text-brand-green">Guesser</span></span>
      </Link>

       <div className="hidden md:flex items-center gap-6 text-sm font-medium">
         <Link to="/" className="text-white/70 hover:text-white transition-colors">Home</Link>
         <Link to="/daily" className="text-white/70 hover:text-white transition-colors flex items-center gap-1">
           <span className="w-2 h-2 rounded-full bg-brand-green inline-block"></span>
           Daily Challenge
         </Link>
         <Link to="/play" className="text-white/70 hover:text-white transition-colors">Quick Play</Link>
         <Link to="/settings" className="text-white/70 hover:text-white transition-colors">Settings</Link>
         {isLoggedIn && (
           <>
             <Link to="/shop" className="text-white/70 hover:text-white transition-colors">Shop</Link>
             <Link to="/profile" className="text-white/70 hover:text-white transition-colors">Profile</Link>
           </>
         )}
       </div>

      <div className="flex items-center gap-3">
        {isLoggedIn ? (
          <>
            <span className="hidden md:flex items-center gap-1.5 text-sm bg-brand-card px-3 py-1.5 rounded-full border border-white/10">
              <span className="text-yellow-400">●</span>
              <span className="font-semibold">{user?.points?.toLocaleString() ?? 0}</span>
              <span className="text-white/50">pts</span>
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-sm text-white/70 hover:text-white transition-colors">Login</Link>
            <Link to="/register" className="btn-primary text-sm py-2 px-4">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
