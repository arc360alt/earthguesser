const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

// GET /api/leaderboard/alltime
router.get('/alltime', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT username, best_score, total_games, points, daily_streak
    FROM users
    ORDER BY best_score DESC
    LIMIT 50
  `).all();
  res.json({ leaderboard: rows });
});

// GET /api/leaderboard/daily
router.get('/daily', (req, res) => {
  const db = getDb();
  const date = new Date().toISOString().slice(0, 10);
  const rows = db.prepare(`
    SELECT u.username, dr.total_score, dr.completed_at
    FROM daily_results dr
    JOIN users u ON u.id = dr.user_id
    WHERE dr.date = ?
    ORDER BY dr.total_score DESC
    LIMIT 50
  `).all(date);
  res.json({ date, leaderboard: rows });
});

module.exports = router;
