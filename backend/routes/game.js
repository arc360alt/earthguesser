const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { getLocationsForGame } = require('../models/locations');
const { haversineDistance, calculateScore, calculateEarnedPoints } = require('../utils/scoring');

const router = express.Router();

// POST /api/game/create
router.post('/create', optionalAuth, async (req, res) => {
  const { region = 'world', rounds = 5, timeLimit = 120, mode = 'standard', noRandomLocations = false } = req.body;

  const validRounds = Math.min(10, Math.max(1, parseInt(rounds)));
  const validTime = Math.min(300, Math.max(30, parseInt(timeLimit)));
  const validModes = ['standard', 'nopan', 'notime'];
  const validMode = validModes.includes(mode) ? mode : 'standard';

  try {
    const gameId = uuidv4();
    const locations = await getLocationsForGame(region, validRounds, noRandomLocations, gameId);
    const db = getDb();

    // Check for active bonus on the user
    let activeBonus = null;
    if (req.userId) {
      const bonus = db
        .prepare(`SELECT * FROM user_bonuses WHERE user_id = ? AND used = 0 ORDER BY purchased_at ASC LIMIT 1`)
        .get(req.userId);
      if (bonus) activeBonus = bonus;
    }

    db.prepare(`
      INSERT INTO games (id, user_id, mode, region, round_count, time_limit, active_bonus)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(gameId, req.userId || null, validMode, region, validRounds, validTime, activeBonus ? activeBonus.bonus_type : null);

    const insertRound = db.prepare(`
      INSERT INTO rounds (id, game_id, round_number, actual_lat, actual_lng, actual_pano_id, continent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    locations.forEach((loc, i) => {
      insertRound.run(uuidv4(), gameId, i + 1, loc.lat, loc.lng, loc.panoId || null, loc.continent);
    });

    // Mark bonus as used
    if (activeBonus) {
      db.prepare('UPDATE user_bonuses SET used = 1 WHERE id = ?').run(activeBonus.id);
    }

    // Return game with first round info
    const firstRound = db
      .prepare('SELECT * FROM rounds WHERE game_id = ? AND round_number = 1')
      .get(gameId);

    // Build response — include continent hint if bonus active
    const responseRound = {
      roundNumber: firstRound.round_number,
      lat: firstRound.actual_lat,
      lng: firstRound.actual_lng,
      panoId: firstRound.actual_pano_id,
    };
    if (activeBonus?.bonus_type === 'continent_hint') {
      responseRound.continentHint = locations[0].continent;
    }

    res.json({
      gameId,
      totalRounds: validRounds,
      timeLimit: validMode === 'notime' ? null : validTime + (activeBonus?.bonus_type === 'time_freeze' ? parseInt(activeBonus.bonus_value) : 0),
      mode: validMode,
      region,
      activeBonus: activeBonus?.bonus_type || null,
      currentRound: responseRound,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/game/:gameId/guess
router.post('/:gameId/guess', optionalAuth, (req, res) => {
  const { gameId } = req.params;
  const { guessLat, guessLng, timeTaken } = req.body;

  if (guessLat === undefined || guessLng === undefined)
    return res.status(400).json({ error: 'guessLat and guessLng required' });

  const db = getDb();
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (game.status !== 'active') return res.status(400).json({ error: 'Game is not active' });

  const nextRoundNum = game.current_round + 1;
  const round = db
    .prepare('SELECT * FROM rounds WHERE game_id = ? AND round_number = ?')
    .get(gameId, nextRoundNum);
  if (!round) return res.status(400).json({ error: 'No more rounds' });

  const distanceKm = haversineDistance(round.actual_lat, round.actual_lng, guessLat, guessLng);
  const multiplier = game.active_bonus === 'score_boost' ? 1.5 : 1;
  const score = calculateScore(distanceKm, multiplier);

  db.prepare(`
      UPDATE rounds SET guess_lat=?, guess_lng=?, distance_km=?, score=?, time_taken=?, submitted_at=datetime('now')
      WHERE id=?
    `).run(guessLat, guessLng, distanceKm, score, timeTaken || null, round.id);

  db.prepare('UPDATE games SET current_round=?, total_score=total_score+? WHERE id=?')
    .run(nextRoundNum, score, gameId);

  const updatedGame = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
  const isLastRound = nextRoundNum >= updatedGame.round_count;

  // Peek next round location (includes pano_id for accurate Google Street View rendering)
  let nextRound = null;
  if (!isLastRound) {
    const nr = db
      .prepare('SELECT round_number, actual_lat, actual_lng, actual_pano_id, continent FROM rounds WHERE game_id = ? AND round_number = ?')
      .get(gameId, nextRoundNum + 1);
    if (nr) nextRound = { roundNumber: nr.round_number, lat: nr.actual_lat, lng: nr.actual_lng, panoId: nr.actual_pano_id, continent: nr.continent };
  }

  res.json({
    score,
    distanceKm: Math.round(distanceKm),
    actualLat: round.actual_lat,
    actualLng: round.actual_lng,
    totalScore: updatedGame.total_score,
    roundNumber: nextRoundNum,
    isLastRound,
    nextRound,
  });
});

// POST /api/game/:gameId/finish
router.post('/:gameId/finish', optionalAuth, (req, res) => {
  const { gameId } = req.params;
  const db = getDb();

  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  // Clear used towns tracking for this game
  const { clearUsedTowns } = require('../models/locations');
  clearUsedTowns(gameId);

  db.prepare(`UPDATE games SET status='finished', finished_at=datetime('now') WHERE id=?`).run(gameId);

  const rounds = db.prepare('SELECT * FROM rounds WHERE game_id = ? ORDER BY round_number').all(gameId);
  const earnedPoints = calculateEarnedPoints(game.total_score, game.round_count);

  if (req.userId) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    db.prepare(`
      UPDATE users SET
        total_games = total_games + 1,
        points = points + ?,
        best_score = MAX(best_score, ?)
      WHERE id = ?
    `).run(earnedPoints, game.total_score, req.userId);
  }

  res.json({
    gameId,
    totalScore: game.total_score,
    maxScore: game.round_count * 5000,
    rounds,
    earnedPoints,
  });
});

// GET /api/game/:gameId
router.get('/:gameId', (req, res) => {
  const db = getDb();
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  const rounds = db.prepare('SELECT * FROM rounds WHERE game_id = ? ORDER BY round_number').all(req.params.gameId);
  res.json({ game, rounds });
});

// POST /api/game/:gameId/reroll - regenerate current round location
router.post('/:gameId/reroll', async (req, res) => {
  const { gameId } = req.params;
  const db = getDb();

  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (game.status !== 'active') return res.status(400).json({ error: 'Game is not active' });

  const currentRoundNum = game.current_round + 1;
  const currentRound = db
    .prepare('SELECT * FROM rounds WHERE game_id = ? AND round_number = ?')
    .get(gameId, currentRoundNum);

  if (!currentRound) return res.status(400).json({ error: 'No current round' });

  try {
    const newLocation = await getRandomStreetViewLocation(game.region, 150, false);
    
    db.prepare(`
      UPDATE rounds SET actual_lat = ?, actual_lng = ?, actual_pano_id = ?
      WHERE id = ?
    `).run(newLocation.lat, newLocation.lng, newLocation.panoId || null, currentRound.id);

    res.json({
      lat: newLocation.lat,
      lng: newLocation.lng,
      panoId: newLocation.panoId || null,
    });
  } catch (err) {
    console.error('Reroll error:', err);
    res.status(500).json({ error: 'Failed to reroll: ' + err.message });
  }
});

module.exports = router;
