import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

export default function Register() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', form);
      setAuth(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold mb-2 text-center">Create account</h1>
        <p className="text-white/50 text-center text-sm mb-8">
          Join EarthGuesser and save your scores
        </p>

        <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
          {error && (
            <div className="bg-brand-accent/20 border border-brand-accent/40 text-brand-accent text-sm rounded-lg px-4 py-2">
              {error}
            </div>
          )}
          <div>
            <label className="label">Username</label>
            <input
              type="text"
              className="input"
              placeholder="CoolExplorer42"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              minLength={3}
              maxLength={24}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              placeholder="At least 6 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-white/50 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-green hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
