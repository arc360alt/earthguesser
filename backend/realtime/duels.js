const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { getLocationsForGame } = require('../models/locations');
const { haversineDistance, calculateScore } = require('../utils/scoring');
const { checkAndUnlockAchievements } = require('../utils/achievements');

const ROUND_COUNT = 5;
const REGION = 'world';
const ROUND_TIME_MS = 90 * 1000;

const queue = []; // [{ socketId, userId, username }]
const duels = new Map(); // duelId -> live duel state
const socketDuel = new Map(); // socketId -> duelId

function removeFromQueue(socketId) {
  const idx = queue.findIndex((q) => q.socketId === socketId);
  if (idx !== -1) queue.splice(idx, 1);
}

function otherPlayer(state, userId) {
  return state.p1.userId === userId ? state.p2 : state.p1;
}

function scoreKeyFor(state, userId) {
  return state.p1.userId === userId ? 'p1' : 'p2';
}

async function initDuelSockets(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('unauthorized'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const db = getDb();
    const userRow = db.prepare('SELECT id, username FROM users WHERE id = ?').get(socket.userId);
    if (!userRow) {
      socket.disconnect(true);
      return;
    }
    socket.username = userRow.username;

    socket.on('duel:queue', () => handleQueue(io, socket));
    socket.on('duel:cancel-queue', () => removeFromQueue(socket.id));
    socket.on('duel:guess', (payload) => handleGuess(io, socket, payload));
    socket.on('disconnect', () => handleDisconnect(io, socket));
  });
}

async function handleQueue(io, socket) {
  if (socketDuel.has(socket.id)) return; // already in a duel
  removeFromQueue(socket.id); // no duplicate queue entries

  const opponent = queue.find((q) => q.userId !== socket.userId);
  if (!opponent) {
    queue.push({ socketId: socket.id, userId: socket.userId, username: socket.username });
    return;
  }
  removeFromQueue(opponent.socketId);

  const opponentSocket = io.sockets.sockets.get(opponent.socketId);
  if (!opponentSocket) {
    // stale entry, requeue this socket
    queue.push({ socketId: socket.id, userId: socket.userId, username: socket.username });
    return;
  }

  await startDuel(io, socket, opponentSocket);
}

async function startDuel(io, socketA, socketB) {
  const db = getDb();
  const duelId = uuidv4();

  let locations;
  try {
    locations = await getLocationsForGame(REGION, ROUND_COUNT, false, duelId);
  } catch (err) {
    socketA.emit('duel:error', { error: 'Failed to find locations, try again.' });
    socketB.emit('duel:error', { error: 'Failed to find locations, try again.' });
    return;
  }

  db.prepare(`
    INSERT INTO duels (id, player1_id, player2_id, region, round_count)
    VALUES (?, ?, ?, ?, ?)
  `).run(duelId, socketA.userId, socketB.userId, REGION, ROUND_COUNT);

  const insertRound = db.prepare(`
    INSERT INTO duel_rounds (id, duel_id, round_number, actual_lat, actual_lng, actual_pano_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  locations.forEach((loc, i) => {
    insertRound.run(uuidv4(), duelId, i + 1, loc.lat, loc.lng, loc.panoId || null);
  });

  const state = {
    duelId,
    locations,
    roundNumber: 1,
    submissions: {},
    timer: null,
    p1: { userId: socketA.userId, username: socketA.username, socketId: socketA.id, totalScore: 0 },
    p2: { userId: socketB.userId, username: socketB.username, socketId: socketB.id, totalScore: 0 },
  };
  duels.set(duelId, state);
  socketDuel.set(socketA.id, duelId);
  socketDuel.set(socketB.id, duelId);

  socketA.join(duelId);
  socketB.join(duelId);

  socketA.emit('duel:start', {
    duelId,
    opponent: socketB.username,
    region: REGION,
    roundCount: ROUND_COUNT,
    timeLimit: ROUND_TIME_MS / 1000,
    round: { roundNumber: 1, lat: locations[0].lat, lng: locations[0].lng, panoId: locations[0].panoId },
  });
  socketB.emit('duel:start', {
    duelId,
    opponent: socketA.username,
    region: REGION,
    roundCount: ROUND_COUNT,
    timeLimit: ROUND_TIME_MS / 1000,
    round: { roundNumber: 1, lat: locations[0].lat, lng: locations[0].lng, panoId: locations[0].panoId },
  });

  armRoundTimer(io, duelId);
}

function armRoundTimer(io, duelId) {
  const state = duels.get(duelId);
  if (!state) return;
  clearTimeout(state.timer);
  state.timer = setTimeout(() => resolveRound(io, duelId), ROUND_TIME_MS);
}

function handleGuess(io, socket, payload = {}) {
  const duelId = socketDuel.get(socket.id);
  if (!duelId) return;
  const state = duels.get(duelId);
  if (!state || payload.roundNumber !== state.roundNumber) return;
  if (state.submissions[socket.userId]) return; // already submitted this round

  state.submissions[socket.userId] = {
    lat: payload.lat,
    lng: payload.lng,
    timeTaken: payload.timeTaken || null,
  };

  const opponent = otherPlayer(state, socket.userId);
  io.to(opponent.socketId).emit('duel:opponent-status', { status: 'guessed' });

  const bothSubmitted = state.p1.userId in state.submissions && state.p2.userId in state.submissions;
  if (bothSubmitted) resolveRound(io, duelId);
}

function resolveRound(io, duelId) {
  const state = duels.get(duelId);
  if (!state) return;
  clearTimeout(state.timer);
  state.timer = null;

  const loc = state.locations[state.roundNumber - 1];
  const db = getDb();

  const results = {};
  for (const key of ['p1', 'p2']) {
    const player = state[key];
    const guess = state.submissions[player.userId];
    if (guess && guess.lat != null && guess.lng != null) {
      const distanceKm = haversineDistance(loc.lat, loc.lng, guess.lat, guess.lng);
      const score = calculateScore(distanceKm);
      results[key] = { guessLat: guess.lat, guessLng: guess.lng, distanceKm: Math.round(distanceKm), score, timeTaken: guess.timeTaken };
    } else {
      results[key] = { guessLat: null, guessLng: null, distanceKm: null, score: 0, timeTaken: null };
    }
    player.totalScore += results[key].score;
  }

  db.prepare(`
    UPDATE duel_rounds SET
      p1_guess_lat=?, p1_guess_lng=?, p1_distance_km=?, p1_score=?, p1_time=?,
      p2_guess_lat=?, p2_guess_lng=?, p2_distance_km=?, p2_score=?, p2_time=?
    WHERE duel_id=? AND round_number=?
  `).run(
    results.p1.guessLat, results.p1.guessLng, results.p1.distanceKm, results.p1.score, results.p1.timeTaken,
    results.p2.guessLat, results.p2.guessLng, results.p2.distanceKm, results.p2.score, results.p2.timeTaken,
    duelId, state.roundNumber
  );
  db.prepare('UPDATE duels SET current_round=?, player1_score=?, player2_score=? WHERE id=?')
    .run(state.roundNumber, state.p1.totalScore, state.p2.totalScore, duelId);

  const isLastRound = state.roundNumber >= ROUND_COUNT;

  for (const key of ['p1', 'p2']) {
    const player = state[key];
    const opponentKey = key === 'p1' ? 'p2' : 'p1';
    const socket = io.sockets.sockets.get(player.socketId);
    if (!socket) continue;
    socket.emit('duel:round-result', {
      roundNumber: state.roundNumber,
      actualLat: loc.lat,
      actualLng: loc.lng,
      you: results[key],
      opponent: results[opponentKey],
      yourTotal: state[key].totalScore,
      opponentTotal: state[opponentKey].totalScore,
      isLastRound,
    });
  }

  if (isLastRound) {
    finishDuel(io, duelId);
    return;
  }

  state.roundNumber += 1;
  state.submissions = {};
  const nextLoc = state.locations[state.roundNumber - 1];
  for (const key of ['p1', 'p2']) {
    const socket = io.sockets.sockets.get(state[key].socketId);
    if (!socket) continue;
    socket.emit('duel:next-round', {
      round: { roundNumber: state.roundNumber, lat: nextLoc.lat, lng: nextLoc.lng, panoId: nextLoc.panoId },
    });
  }
  armRoundTimer(io, duelId);
}

function finishDuel(io, duelId) {
  const state = duels.get(duelId);
  if (!state) return;
  const db = getDb();

  let winnerId = null;
  if (state.p1.totalScore > state.p2.totalScore) winnerId = state.p1.userId;
  else if (state.p2.totalScore > state.p1.totalScore) winnerId = state.p2.userId;

  db.prepare(`UPDATE duels SET status='finished', winner_id=?, finished_at=datetime('now') WHERE id=?`)
    .run(winnerId, duelId);

  for (const key of ['p1', 'p2']) {
    const player = state[key];
    const opponentKey = key === 'p1' ? 'p2' : 'p1';
    const won = winnerId === player.userId;
    const newAchievements = won ? checkAndUnlockAchievements(db, player.userId, { duelWin: true }) : [];

    const socket = io.sockets.sockets.get(player.socketId);
    if (socket) {
      socket.emit('duel:duel-over', {
        result: winnerId === null ? 'draw' : won ? 'win' : 'loss',
        yourScore: player.totalScore,
        opponentScore: state[opponentKey].totalScore,
        newAchievements,
      });
      socketDuel.delete(socket.id);
    }
  }

  duels.delete(duelId);
}

function handleDisconnect(io, socket) {
  removeFromQueue(socket.id);
  const duelId = socketDuel.get(socket.id);
  if (!duelId) return;
  const state = duels.get(duelId);
  if (!state) return;

  clearTimeout(state.timer);
  const remaining = otherPlayer(state, socket.userId);
  const db = getDb();
  db.prepare(`UPDATE duels SET status='abandoned', winner_id=?, finished_at=datetime('now') WHERE id=?`)
    .run(remaining.userId, duelId);

  const remainingSocket = io.sockets.sockets.get(remaining.socketId);
  if (remainingSocket) {
    const newAchievements = checkAndUnlockAchievements(db, remaining.userId, { duelWin: true });
    remainingSocket.emit('duel:opponent-left', { yourScore: remaining.totalScore, newAchievements });
    socketDuel.delete(remainingSocket.id);
  }

  socketDuel.delete(socket.id);
  duels.delete(duelId);
}

module.exports = { initDuelSockets };
