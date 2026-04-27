const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './earthguesser.db';
let db;

function getDb() {
  if (!db) {
    db = new Database(path.resolve(DB_PATH));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      points INTEGER DEFAULT 0,
      total_games INTEGER DEFAULT 0,
      best_score INTEGER DEFAULT 0,
      daily_streak INTEGER DEFAULT 0,
      last_daily_date TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      mode TEXT NOT NULL,
      region TEXT NOT NULL,
      round_count INTEGER NOT NULL,
      time_limit INTEGER NOT NULL,
      current_round INTEGER DEFAULT 0,
      total_score INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      active_bonus TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      finished_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS rounds (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      round_number INTEGER NOT NULL,
      actual_lat REAL NOT NULL,
      actual_lng REAL NOT NULL,
      actual_pano_id TEXT,
      continent TEXT,
      guess_lat REAL,
      guess_lng REAL,
      distance_km REAL,
      score INTEGER DEFAULT 0,
      time_taken INTEGER,
      submitted_at TEXT,
      FOREIGN KEY (game_id) REFERENCES games(id)
    );

    CREATE TABLE IF NOT EXISTS daily_challenges (
      date TEXT PRIMARY KEY,
      locations TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_results (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      total_score INTEGER NOT NULL,
      mode TEXT NOT NULL,
      region TEXT NOT NULL,
      completed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (date) REFERENCES daily_challenges(date)
    );

    CREATE TABLE IF NOT EXISTS user_bonuses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      bonus_type TEXT NOT NULL,
      bonus_value TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      purchased_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expired TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Run migrations
  const migrations = [
    { name: 'add_continent_to_rounds', sql: 'ALTER TABLE rounds ADD COLUMN continent TEXT' },
  ];

  const getMigration = db.prepare('SELECT name FROM migrations WHERE name = ?');
  const setMigration = db.prepare('INSERT INTO migrations (name) VALUES (?)');

  for (const m of migrations) {
    try {
      if (!getMigration.get(m.name)) {
        db.exec(m.sql);
        setMigration.run(m.name);
      }
    } catch (e) {
      if (!e.message.includes('duplicate column name')) {
        console.error(`Migration ${m.name} failed:`, e.message);
      }
    }
  }

  seedShopItems(db);
}

function seedShopItems(db) {
  const existing = db.prepare('SELECT COUNT(*) as c FROM shop_items').get();
  if (existing.c > 0) return;

  const items = [
    {
      id: 'time_freeze',
      name: 'Time Freeze',
      description: 'Adds 30 extra seconds to every round in your next game.',
      icon: 'clock',
      cost: 500,
      bonus_type: 'time_freeze',
      bonus_value: '30'
    },
    {
      id: 'score_boost',
      name: 'Score Boost',
      description: 'Earn 1.5x points for your next game.',
      icon: 'zap',
      cost: 750,
      bonus_type: 'score_boost',
      bonus_value: '1.5'
    },
    {
      id: 'continent_hint',
      name: 'Continent Hint',
      description: 'Reveals which continent you are on at the start of each round.',
      icon: 'map',
      cost: 300,
      bonus_type: 'continent_hint',
      bonus_value: 'true'
    },
    {
      id: 'double_streak',
      name: 'Streak Shield',
      description: 'Protects your daily streak from breaking once.',
      icon: 'shield',
      cost: 1000,
      bonus_type: 'streak_shield',
      bonus_value: 'true'
    },
    {
      id: 'region_radar',
      name: 'Region Radar',
      description: 'Highlights the correct world region on the map after submitting.',
      icon: 'crosshair',
      cost: 400,
      bonus_type: 'region_radar',
      bonus_value: 'true'
    }
  ];

  const insert = db.prepare(`
    INSERT INTO shop_items (id, name, description, icon, cost, bonus_type, bonus_value)
    VALUES (@id, @name, @description, @icon, @cost, @bonus_type, @bonus_value)
  `);

  for (const item of items) {
    insert.run(item);
  }
}

module.exports = { getDb, initDb };
