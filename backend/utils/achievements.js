const { v4: uuidv4 } = require('uuid');

// Static catalog — seeded into the `achievements` table on first boot.
const ACHIEVEMENTS = [
  { id: 'first_steps', name: 'First Steps', description: 'Complete your first game.', icon: '👣', tier: 'bronze' },
  { id: 'century_club', name: 'Century Club', description: 'Complete 100 games.', icon: '💯', tier: 'gold' },
  { id: 'perfect_round', name: 'Bullseye', description: 'Score a perfect 5000 on a single round.', icon: '🎯', tier: 'silver' },
  { id: 'sharpshooter', name: 'Sharpshooter', description: 'Average under 100km off in a game of 3+ rounds.', icon: '🔭', tier: 'silver' },
  { id: 'globetrotter', name: 'Globetrotter', description: 'Play a finished game in every region.', icon: '🌍', tier: 'gold' },
  { id: 'no_pan_master', name: 'Frozen Focus', description: 'Score 4500+ on a round in No Move mode.', icon: '🧊', tier: 'silver' },
  { id: 'week_streak', name: 'On a Roll', description: 'Reach a 7-day Daily Challenge streak.', icon: '🔥', tier: 'silver' },
  { id: 'month_streak', name: 'Unstoppable', description: 'Reach a 30-day Daily Challenge streak.', icon: '🏔️', tier: 'gold' },
  { id: 'high_roller', name: 'High Roller', description: 'Hold 5000+ points at once.', icon: '💰', tier: 'gold' },
  { id: 'big_spender', name: 'Big Spender', description: 'Buy 5 bonuses from the shop.', icon: '🛍️', tier: 'bronze' },
  { id: 'duelist', name: 'Duelist', description: 'Win your first duel.', icon: '⚔️', tier: 'bronze' },
  { id: 'rival_crusher', name: 'Rival Crusher', description: 'Win 10 duels.', icon: '🏆', tier: 'gold' },
];

const REGIONS_FOR_GLOBETROTTER = ['europe', 'north_america', 'south_america', 'asia', 'africa', 'oceania'];

/**
 * Checks achievement conditions after a game/daily/duel finishes and unlocks any newly-earned ones.
 * `ctx` fields are all optional — only pass what the caller already has on hand:
 *   - user: the user's row AFTER this game's points/streak update was applied
 *   - game: { round_count, region, mode } for the game/daily just finished (mode: 'standard'|'nopan'|'notime'|'daily')
 *   - rounds: array of { score, distance_km } for that game/daily (if available)
 *   - duelWin: true if this call is for a duel the user just won
 */
function checkAndUnlockAchievements(db, userId, ctx = {}) {
  if (!userId) return [];

  const alreadyUnlocked = new Set(
    db.prepare('SELECT achievement_id FROM user_achievements WHERE user_id = ?').all(userId)
      .map((r) => r.achievement_id)
  );

  const earned = new Set();
  const { user, game, rounds, duelWin } = ctx;

  if (user) {
    if (user.total_games >= 1) earned.add('first_steps');
    if (user.total_games >= 100) earned.add('century_club');
    if (user.daily_streak >= 7) earned.add('week_streak');
    if (user.daily_streak >= 30) earned.add('month_streak');
    if (user.points >= 5000) earned.add('high_roller');
  }

  if (Array.isArray(rounds) && rounds.length > 0) {
    const scored = rounds.filter((r) => r.score != null);
    if (scored.some((r) => r.score >= 5000)) earned.add('perfect_round');

    const distances = rounds.filter((r) => r.distance_km != null);
    if (distances.length >= 3) {
      const avg = distances.reduce((s, r) => s + r.distance_km, 0) / distances.length;
      if (avg < 100) earned.add('sharpshooter');
    }

    if (game?.mode === 'nopan' && scored.some((r) => r.score >= 4500)) earned.add('no_pan_master');
  }

  if (game?.region === 'world' || REGIONS_FOR_GLOBETROTTER.includes(game?.region)) {
    const playedRegions = db
      .prepare(`SELECT DISTINCT region FROM games WHERE user_id = ? AND status = 'finished'`)
      .all(userId)
      .map((r) => r.region);
    if (REGIONS_FOR_GLOBETROTTER.every((r) => playedRegions.includes(r))) earned.add('globetrotter');
  }

  const bonusCount = db.prepare('SELECT COUNT(*) as c FROM user_bonuses WHERE user_id = ?').get(userId).c;
  if (bonusCount >= 5) earned.add('big_spender');

  if (duelWin) {
    earned.add('duelist');
    const duelWins = db
      .prepare('SELECT COUNT(*) as c FROM duels WHERE winner_id = ? AND status = ?')
      .get(userId, 'finished').c;
    if (duelWins >= 10) earned.add('rival_crusher');
  }

  const toUnlock = [...earned].filter((id) => !alreadyUnlocked.has(id));
  if (toUnlock.length === 0) return [];

  const insert = db.prepare('INSERT INTO user_achievements (id, user_id, achievement_id) VALUES (?, ?, ?)');
  for (const id of toUnlock) insert.run(uuidv4(), userId, id);

  return ACHIEVEMENTS.filter((a) => toUnlock.includes(a.id));
}

module.exports = { ACHIEVEMENTS, checkAndUnlockAchievements };
