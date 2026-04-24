const express = require('express');

const router = express.Router();
const { nearestKartaViewPhoto } = require('../utils/kartaview');

// GET /api/kartaview/nearest?lat=..&lng=..&radius=..&only360=1
router.get('/nearest', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radius = Math.min(5000, Math.max(25, Number(req.query.radius ?? 500)));
  // Default: include non-360 too (much higher hit-rate). Pass only360=1 to require spherical.
  const only360 = String(req.query.only360 ?? '0') !== '0';

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'lat and lng are required numbers' });
  }

  try {
    const out = await nearestKartaViewPhoto(
      { lat, lng, radius, limit: 30 },
      { requireSphere: only360 ? true : false }
    );
    if (!out.found) return res.json({ found: false });
    return res.json(out);
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: 'KartaView request failed' });
  }
});

module.exports = router;

