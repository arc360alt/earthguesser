const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { getLocationsForGame } = require('../models/locations');
const { haversineDistance, calculateScore, calculateEarnedPoints } = require('../utils/scoring');

const router = express.Router();

const DAILY_ROUNDS = 5;
const DAILY_TIME = 120;

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

async function getOrCreateDailyChallenge(date) {
  const db = getDb();
  let daily = db.prepare('SELECT * FROM daily_challenges WHERE date = ?').get(date);
  if (!daily) {
    const locations = await getLocationsForGame('world', DAILY_ROUNDS);
    const locJson = JSON.stringify(locations);
    try {
      db.prepare('INSERT INTO daily_challenges (date, locations) VALUES (?, ?)').run(date, locJson);
    } catch (err) {
      if (err.code !== 'SQLITE_CONSTRAINT_PRIMARYKEY') throw err;
    }
    daily = db.prepare('SELECT * FROM daily_challenges WHERE date = ?').get(date);
  }
  return { ...daily, locations: JSON.parse(daily.locations) };
}

// GET /api/daily — get today's challenge metadata + whether the user has done it
router.get('/', optionalAuth, async (req, res) => {
  try {
    const date = todayString();
    const daily = await getOrCreateDailyChallenge(date);
    const db = getDb();

    let userResult = null;
    if (req.userId) {
      userResult = db
        .prepare('SELECT * FROM daily_results WHERE user_id = ? AND date = ?')
        .get(req.userId, date);
    }

    res.json({
      date,
      rounds: DAILY_ROUNDS,
      timeLimit: DAILY_TIME,
      completed: !!userResult,
      result: userResult || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/daily/start — get the actual locations to play
router.post('/start', optionalAuth, async (req, res) => {
  try {
    const date = todayString();
    const db = getDb();

    if (req.userId) {
      const done = db
        .prepare('SELECT id FROM daily_results WHERE user_id = ? AND date = ?')
        .get(req.userId, date);
      if (done) return res.status(409).json({ error: 'Already completed today\'s challenge' });
    }

    const daily = await getOrCreateDailyChallenge(date);

    res.json({
      date,
      rounds: DAILY_ROUNDS,
      timeLimit: DAILY_TIME,
      locations: daily.locations,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/daily/submit — submit full daily results
router.post('/submit', optionalAuth, async (req, res) => {
  const { guesses } = req.body;
  if (!Array.isArray(guesses) || guesses.length !== DAILY_ROUNDS)
    return res.status(400).json({ error: `Expected ${DAILY_ROUNDS} guesses` });

  try {
    const date = todayString();
    const daily = await getOrCreateDailyChallenge(date);
    const db = getDb();

    if (req.userId) {
      const done = db
        .prepare('SELECT id FROM daily_results WHERE user_id = ? AND date = ?')
        .get(req.userId, date);
      if (done) return res.status(409).json({ error: 'Already submitted today\'s challenge' });
    }

    const roundScores = guesses.map((guess, i) => {
      const actual = daily.locations[i];
      const distanceKm = haversineDistance(actual.lat, actual.lng, guess.lat, guess.lng);
      const score = calculateScore(distanceKm);
      return {
        roundNumber: i + 1,
        actualLat: actual.lat,
        actualLng: actual.lng,
        guessLat: guess.lat,
        guessLng: guess.lng,
        distanceKm: Math.round(distanceKm),
        score,
      };
    });

    const totalScore = roundScores.reduce((s, r) => s + r.score, 0);
    const earnedPoints = calculateEarnedPoints(totalScore, DAILY_ROUNDS);

    if (req.userId) {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);

      // Streak logic
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);
      const newStreak = user.last_daily_date === yStr ? user.daily_streak + 1 : 1;

      db.prepare(`
        INSERT INTO daily_results (id, user_id, date, total_score, round_scores)
        VALUES (?, ?, ?, ?, ?)
      `).run(uuidv4(), req.userId, date, totalScore, JSON.stringify(roundScores));

      db.prepare(`
        UPDATE users SET
          points = points + ?,
          best_score = MAX(best_score, ?),
          total_games = total_games + 1,
          daily_streak = ?,
          last_daily_date = ?
        WHERE id = ?
      `).run(earnedPoints, totalScore, newStreak, date, req.userId);

      const updatedUser = db.prepare('SELECT daily_streak FROM users WHERE id = ?').get(req.userId);

      return res.json({
        totalScore,
        maxScore: DAILY_ROUNDS * 5000,
        roundScores,
        earnedPoints,
        dailyStreak: updatedUser.daily_streak,
      });
    }

    res.json({ totalScore, maxScore: DAILY_ROUNDS * 5000, roundScores, earnedPoints, dailyStreak: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/daily/leaderboard — today's top scores
router.get('/leaderboard', async (req, res) => {
  try {
    const db = getDb();
    const date = todayString();
    const rows = db.prepare(`
      SELECT u.username, dr.total_score, dr.completed_at
      FROM daily_results dr
      JOIN users u ON u.id = dr.user_id
      WHERE dr.date = ?
      ORDER BY dr.total_score DESC
      LIMIT 20
    `).all(date);
    res.json({ date, leaderboard: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
