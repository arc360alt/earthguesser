const express = require('express');
const { getDb } = require('../db');
const { optionalAuth } = require('../middleware/auth');
const { ACHIEVEMENTS } = require('../utils/achievements');

const router = express.Router();

// GET /api/achievements
router.get('/', optionalAuth, (req, res) => {
  const db = getDb();
  const catalog = db.prepare('SELECT * FROM achievements').all();

  let unlocked = {};
  if (req.userId) {
    const rows = db
      .prepare('SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = ?')
      .all(req.userId);
    unlocked = Object.fromEntries(rows.map((r) => [r.achievement_id, r.unlocked_at]));
  }

  const achievements = catalog.map((a) => ({
    ...a,
    unlocked: !!unlocked[a.id],
    unlockedAt: unlocked[a.id] || null,
  }));

  res.json({ achievements, unlockedCount: Object.keys(unlocked).length, totalCount: ACHIEVEMENTS.length });
});

module.exports = router;
