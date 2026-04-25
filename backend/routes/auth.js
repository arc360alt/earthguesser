const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'username, email and password are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM users WHERE email = ? OR username = ?')
    .get(email, username);
  if (existing) return res.status(409).json({ error: 'Email or username already in use' });

  const password_hash = await bcrypt.hash(password, 10);
  const id = uuidv4();
  db.prepare(
    'INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)'
  ).run(id, username, email, password_hash);

  const token = jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  const user = db.prepare('SELECT id, username, email, points, total_games, best_score, daily_streak, created_at FROM users WHERE id = ?').get(id);
  res.status(201).json({ token, user });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'email and password are required' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.get('/me', requireAuth, (req, res) => {
  const db = getDb();
  const user = db
    .prepare('SELECT id, username, email, points, total_games, best_score, daily_streak, last_daily_date, created_at FROM users WHERE id = ?')
    .get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const bonuses = db
    .prepare('SELECT * FROM user_bonuses WHERE user_id = ? AND used = 0')
    .all(req.userId);

  res.json({ user, bonuses });
});

module.exports = router;
