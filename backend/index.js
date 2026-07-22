require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const { initDb } = require('./db');

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const dailyRoutes = require('./routes/daily');
const leaderboardRoutes = require('./routes/leaderboard');
const shopRoutes = require('./routes/shop');
const kartaviewRoutes = require('./routes/kartaview');
const streetviewInfoRoutes = require('./routes/streetviewInfo');
const mapillaryRoutes = require('./routes/mapillary');
const achievementsRoutes = require('./routes/achievements');
const { getConfiguredProvider, hasMapillaryToken, hasGoogleKey } = require('./utils/streetviewProvider');
const { preload: preloadCityPool } = require('./utils/globalCityPool');
const { initDuelSockets } = require('./realtime/duels');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

initDb();

app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/daily', dailyRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/kartaview', kartaviewRoutes);
app.use('/api/streetview', streetviewInfoRoutes);
app.use('/api/mapillary', mapillaryRoutes);
app.use('/api/achievements', achievementsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
initDuelSockets(io);

server.listen(PORT, () => {
  const cfg = getConfiguredProvider();
  console.log(`EarthGuesser API running on http://localhost:${PORT}`);
  // Preload city pool in background so first game has no cold-start delay
  setImmediate(() => preloadCityPool());
  // eslint-disable-next-line no-console
  console.log(
    `[streetview] configured=${cfg} googleKey=${hasGoogleKey() ? 'yes' : 'no'} mapillaryToken=${hasMapillaryToken() ? 'yes' : 'no'}`
  );
});
