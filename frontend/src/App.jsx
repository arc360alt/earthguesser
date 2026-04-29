import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import GameSetup from './pages/GameSetup';
import Game from './pages/Game';
import DailyChallenge from './pages/DailyChallenge';
import GameResult from './pages/GameResult';
import Profile from './pages/Profile';
import Shop from './pages/Shop';
import Settings from './pages/Settings';
import { useAuth } from './hooks/useAuth';

function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-brand-dark">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/play" element={<GameSetup />} />
          <Route path="/game/:gameId" element={<Game />} />
          <Route path="/daily" element={<DailyChallenge />} />
          <Route path="/result/:gameId" element={<GameResult />} />
          <Route path="/settings" element={<Settings />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shop"
            element={
              <ProtectedRoute>
                <Shop />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
