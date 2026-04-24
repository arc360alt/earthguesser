const express = require('express');
const { nearestMapillaryImage } = require('../utils/mapillary');

const router = express.Router();

// GET /api/mapillary/nearest?lat&lng
router.get('/nearest', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'lat and lng are required numbers' });
  }

  try {
    const out = await nearestMapillaryImage({ lat, lng });
    if (!out.found) return res.json({ found: false });
    return res.json(out);
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: 'Mapillary request failed' });
  }
});

module.exports = router;
