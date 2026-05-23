'use strict';

const { checkKartaViewCoverage } = require('../utils/kartaview');
const { checkMapillaryCoverage } = require('../utils/mapillary');
const { getGameplayStreetViewProvider } = require('../utils/activeStreetview');
const { sampleCandidateBatch, getCountryContinent } = require('../utils/globalCityPool');

// Region → continent label for the continent_hint bonus
const CONTINENT_MAP = {
  world: null,
  europe: 'Europe',
  north_america: 'North America',
  south_america: 'South America',
  asia: 'Asia',
  africa: 'Africa',
  oceania: 'Oceania',
};

// Per-game state for deduplication
const usedCountries = new Map();

function markCountryUsed(gameId, country) {
  if (!gameId || !country) return;
  if (!usedCountries.has(gameId)) usedCountries.set(gameId, new Set());
  usedCountries.get(gameId).add(country);
}

function isCountryUsed(gameId, country) {
  if (!gameId || !country) return false;
  return usedCountries.get(gameId)?.has(country) || false;
}

function clearUsedCountries(gameId) {
  usedCountries.delete(gameId);
}

// usedTowns kept for API compatibility with routes/game.js
const usedTowns = new Map();
function markTownUsed(gameId, name) {
  if (!usedTowns.has(gameId)) usedTowns.set(gameId, new Set());
  usedTowns.get(gameId).add(name);
}
function clearUsedTowns(gameId) {
  usedTowns.delete(gameId);
}

// Soft reverse-geocode: just return the city name we already know from the pool.
// Kept as a named export so routes that import it still work.
async function getCountryFromCoords(lat, lng) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=3&addressdetails=1`,
      { headers: { 'User-Agent': 'EarthGuesser/1.0' }, signal: controller.signal }
    );
    clearTimeout(id);
    const data = await res.json();
    return data?.address?.country || null;
  } catch {
    return null;
  }
}

// Google Street View metadata coverage check
async function checkGoogleCoverage(lat, lng) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return { found: false };
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 6000);
    const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&radius=2000&source=outdoor&key=${key}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    const data = await res.json();
    if (data.status !== 'OK') return { found: false };
    if (data.location_type === 'indoor') return { found: false };
    return {
      found: true,
      lat: data.location.lat,
      lng: data.location.lng,
      panoId: data.pano_id || null,
    };
  } catch {
    return { found: false };
  }
}

/**
 * Given a list of promises that each resolve to a result object or null,
 * resolves with the first non-null value, or null if all fail/return null.
 */
function firstSuccess(promises) {
  return new Promise((resolve) => {
    let remaining = promises.length;
    if (remaining === 0) { resolve(null); return; }
    let resolved = false;

    for (const p of promises) {
      p.then((val) => {
        remaining--;
        if (val && !resolved) {
          resolved = true;
          resolve(val);
        } else if (remaining === 0 && !resolved) {
          resolve(null);
        }
      }).catch(() => {
        remaining--;
        if (remaining === 0 && !resolved) resolve(null);
      });
    }
  });
}

// Number of candidates to check in parallel per batch, tuned per provider
const BATCH_SIZE = { google: 8, mapillary: 6, kartaview: 4 };
const MAX_BATCHES = 20; // hard cap before giving up

/**
 * Find a random location with actual street-imagery coverage for a region.
 * Uses parallel coverage checks across multiple candidates per batch.
 *
 * @param {string}  region           - 'world' | 'europe' | ...
 * @param {boolean} nearTown         - if true, stay within ~3 km of a town/city
 * @param {string|null} gameId       - used for per-game country deduplication
 */
async function getRandomStreetViewLocation(region, nearTown, gameId) {
  const continent = CONTINENT_MAP[region] ?? null;
  const { provider } = await getGameplayStreetViewProvider();

  async function checkCoverage(lat, lng) {
    if (provider === 'kartaview') return checkKartaViewCoverage({ lat, lng });
    if (provider === 'mapillary') return checkMapillaryCoverage({ lat, lng });
    return checkGoogleCoverage(lat, lng);
  }

  const batchSize = BATCH_SIZE[provider] || 6;
  const excludedCountries = gameId ? (usedCountries.get(gameId) || new Set()) : new Set();

  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    const candidates = sampleCandidateBatch(region, batchSize, excludedCountries, nearTown);

    const winner = await firstSuccess(
      candidates.map((c) =>
        checkCoverage(c.lat, c.lng).then((r) => {
          if (!r.found) return null;
          // Enforce country dedup: skip if this country was already used in this game
          if (gameId && isCountryUsed(gameId, c.country)) return null;
          return {
            lat: r.lat,
            lng: r.lng,
            panoId: r.panoId || null,
            continent,
            cityName: c.name,
            country: c.country,
          };
        }).catch(() => null)
      )
    );

    if (winner) {
      markCountryUsed(gameId, winner.country);
      // Use the city's actual continent rather than the game region label —
      // critical for world-mode games where continent is null at the region level.
      winner.continent = getCountryContinent(winner.country) || continent;
      return winner;
    }
  }

  throw new Error(
    `No street-view coverage found in region "${region}" after ${MAX_BATCHES} batches. ` +
    `Provider: ${provider}. Try a different region or check your API credentials.`
  );
}

/**
 * Generate all locations for a game.
 * Rounds are generated sequentially so per-game country dedup stays accurate,
 * but each individual round uses parallel candidate checks for speed.
 */
async function getLocationsForGame(region, count, noRandomLocations, gameId) {
  const locations = [];
  for (let i = 0; i < count; i++) {
    const loc = await getRandomStreetViewLocation(region, noRandomLocations, gameId);
    locations.push(loc);
  }
  return locations;
}

function getRegions() {
  return Object.keys(CONTINENT_MAP).map((key) => ({
    id: key,
    label: key.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
  }));
}

module.exports = {
  getRandomStreetViewLocation,
  getLocationsForGame,
  getRegions,
  clearUsedTowns,
  clearUsedCountries,
  markCountryUsed,
  isCountryUsed,
  getCountryFromCoords,
};
