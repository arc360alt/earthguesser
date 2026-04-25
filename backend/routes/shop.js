const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/shop
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const items = db.prepare('SELECT * FROM shop_items').all();
  const user = db.prepare('SELECT points FROM users WHERE id = ?').get(req.userId);
  const ownedBonuses = db
    .prepare('SELECT bonus_type FROM user_bonuses WHERE user_id = ? AND used = 0')
    .all(req.userId)
    .map((b) => b.bonus_type);

  res.json({ items, userPoints: user.points, ownedBonuses });
});

// POST /api/shop/buy
router.post('/buy', requireAuth, (req, res) => {
  const { itemId } = req.body;
  if (!itemId) return res.status(400).json({ error: 'itemId required' });

  const db = getDb();
  const item = db.prepare('SELECT * FROM shop_items WHERE id = ?').get(itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const user = db.prepare('SELECT points FROM users WHERE id = ?').get(req.userId);
  if (user.points < item.cost)
    return res.status(402).json({ error: 'Not enough points', need: item.cost, have: user.points });

  // Check if user already has an unused bonus of this type
  const existing = db
    .prepare('SELECT id FROM user_bonuses WHERE user_id = ? AND bonus_type = ? AND used = 0')
    .get(req.userId, item.bonus_type);
  if (existing)
    return res.status(409).json({ error: 'You already have an unused bonus of this type' });

  const bonusId = uuidv4();
  db.prepare('INSERT INTO user_bonuses (id, user_id, bonus_type, bonus_value) VALUES (?, ?, ?, ?)')
    .run(bonusId, req.userId, item.bonus_type, item.bonus_value);

  db.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(item.cost, req.userId);

  const updatedUser = db.prepare('SELECT points FROM users WHERE id = ?').get(req.userId);
  res.json({ success: true, newPoints: updatedUser.points, bonus: { id: bonusId, type: item.bonus_type } });
});

module.exports = router;
