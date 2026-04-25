const express = require('express');
const { getGameplayStreetViewProvider } = require('../utils/activeStreetview');

const router = express.Router();

// GET /api/streetview
router.get('/', async (req, res) => {
  try {
    const out = await getGameplayStreetViewProvider();
    return res.json({
      provider: out.provider,
      configured: out.configured,
      failoverFrom: out.failoverFrom || null,
      note: out.note || null,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Failed to resolve streetview provider' });
  }
});

module.exports = router;
