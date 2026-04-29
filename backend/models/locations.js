const REGION_BOUNDS = {
  world:         { minLat: -60,  maxLat: 75,  minLng: -180, maxLng: 180 },
  europe:        { minLat: 35,   maxLat: 71,  minLng: -25,  maxLng: 40 },
  north_america: { minLat: 15,   maxLat: 72,  minLng: -168, maxLng: -52 },
  south_america: { minLat: -55,  maxLat: 13,  minLng: -82,  maxLng: -34 },
  asia:          { minLat: 5,    maxLat: 55,  minLng: 60,   maxLng: 145 },
  africa:        { minLat: -35,  maxLat: 37,  minLng: -18,  maxLng: 52 },
  oceania:       { minLat: -47,  maxLat: -5,  minLng: 112,  maxLng: 180 },
};

const CONTINENT_MAP = {
  world: null,
  europe: 'Europe',
  north_america: 'North America',
  south_america: 'South America',
  asia: 'Asia',
  africa: 'Africa',
  oceania: 'Oceania',
};

const { checkKartaViewCoverage } = require('../utils/kartaview');
const { checkMapillaryCoverage } = require('../utils/mapillary');
const { getGameplayStreetViewProvider } = require('../utils/activeStreetview');
const { sampleKartaViewCandidateLatLng } = require('./kartaviewSeeds');
const { getCityForRegion, findNearbyCityLocation, MAX_METERS_FROM_CITY } = require('../utils/nominatim');
const { TOWNS_BY_REGION } = require('../data/towns');

const usedTowns = new Map();
const usedCountries = new Map();

function markTownUsed(gameId, townName) {
  if (!usedTowns.has(gameId)) usedTowns.set(gameId, new Set());
  usedTowns.get(gameId).add(townName);
}

function isTownUsed(gameId, townName) {
  return usedTowns.get(gameId)?.has(townName) || false;
}

function clearUsedTowns(gameId) {
  usedTowns.delete(gameId);
}

function markCountryUsed(gameId, countryName) {
  if (!usedCountries.has(gameId)) usedCountries.set(gameId, new Set());
  if (countryName) usedCountries.get(gameId).add(countryName);
}

function isCountryUsed(gameId, countryName) {
  if (!countryName) return false;
  return usedCountries.get(gameId)?.has(countryName) || false;
}

function clearUsedCountries(gameId) {
  usedCountries.delete(gameId);
}

async function getCountryFromCoords(lat, lng) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=3&addressdetails=1`,
      { headers: { 'User-Agent': 'EarthGuesser/1.0' }, signal: controller.signal }
    );
    clearTimeout(timeoutId);
    const data = await res.json();
    return data?.address?.country || null;
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function checkStreetViewCoverage(lat, lng) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return { found: false };
  try {
    const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&radius=2000&key=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK') {
      if (data.location_type === 'indoor') return { found: false };
      const copyright = data.copyright || '';
      if (!copyright.includes('Google')) return { found: false };
      return {
        found: true,
        lat: data.location.lat,
        lng: data.location.lng,
        panoId: data.pano_id || null
      };
    }
    return { found: false };
  } catch {
    return { found: false };
  }
}

function getMaxAttempts() {
  const n = Number(process.env.STREETVIEW_MAX_ATTEMPTS);
  if (Number.isFinite(n) && n > 0) return Math.min(500, Math.floor(n));
  return 150;
}

async function getRandomStreetViewLocation(region, maxAttempts, noRandomLocations, gameId) {
  const bounds = REGION_BOUNDS[region] || REGION_BOUNDS.world;
  const continent = CONTINENT_MAP[region];
  const { provider } = await getGameplayStreetViewProvider();
  const attempts = maxAttempts || getMaxAttempts();

  async function checkCoverage(lat, lng) {
    if (provider === 'kartaview') return await checkKartaViewCoverage({ lat, lng });
    if (provider === 'mapillary') return await checkMapillaryCoverage({ lat, lng });
    return await checkStreetViewCoverage(lat, lng);
  }

  // Use static town list
  if (noRandomLocations) {
    const towns = TOWNS_BY_REGION[region] || TOWNS_BY_REGION.world;
    if (towns && towns.length > 0) {
      const availableTowns = gameId
        ? towns.filter((t) => !isTownUsed(gameId, t.name))
        : towns;

      const shuffled = [...availableTowns].sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(5, shuffled.length); i++) {
        const town = shuffled[i];
        const jitterKm = Math.random() * MAX_METERS_FROM_CITY / 1000;
        const offsetLat = (jitterKm / 111) * (Math.random() - 0.5) * 2;
        const offsetLng = (jitterKm / (111 * Math.max(0.5, Math.cos((town.lat * Math.PI) / 180)))) * (Math.random() - 0.5) * 2;
        const lat = town.lat + offsetLat;
        const lng = town.lng + offsetLng;

        const result = await checkCoverage(lat, lng);
        if (result.found) {
          if (gameId) {
            const country = await getCountryFromCoords(result.lat, result.lng);
            if (country && isCountryUsed(gameId, country)) continue;
            markTownUsed(gameId, town.name);
            markCountryUsed(gameId, country);
          }
          return { lat: result.lat, lng: result.lng, continent, panoId: result.panoId || null };
        }
      }
    }
  }

  let cityData = null;
  if (noRandomLocations) {
    cityData = getCityForRegion(region);
    if (!cityData) noRandomLocations = false;
  }

  const actualAttempts = noRandomLocations ? Math.min(attempts, 100) : attempts;

  for (let i = 0; i < actualAttempts; i++) {
    let lat, lng;

    if (noRandomLocations && cityData) {
      const freshCity = getCityForRegion(region);
      const cityResult = findNearbyCityLocation(region, freshCity);
      if (cityResult) { lat = cityResult.lat; lng = cityResult.lng; }
    }

    if (!lat || !lng) {
      const p = sampleKartaViewCandidateLatLng(region);
      if (p) { lat = p.lat; lng = p.lng; }
      else {
        lat = bounds.minLat + Math.random() * (bounds.maxLat - bounds.minLat);
        lng = bounds.minLng + Math.random() * (bounds.maxLng - bounds.minLng);
      }
    }

    if (provider === 'kartaview' || provider === 'mapillary') {
      const p = sampleKartaViewCandidateLatLng(region);
      if (p) { lat = p.lat; lng = p.lng; }
    }

    const result = await checkCoverage(lat, lng);
    if (result.found) {
      if (gameId) {
        const country = await getCountryFromCoords(result.lat, result.lng);
        if (country && isCountryUsed(gameId, country)) continue;
        markCountryUsed(gameId, country);
      }
      return { lat: result.lat, lng: result.lng, continent, panoId: result.panoId || null };
    }
    if (provider === 'kartaview') await sleep(20);
  }

  const hint = provider === 'kartaview' ? ' KartaView API may be saturated. Try again later or set MAPILLARY_ACCESS_TOKEN.' : '';
  throw new Error(`No Street View coverage found in region "${region}" after ${attempts} attempts.${hint}`);
}

async function getLocationsForGame(region, count, noRandomLocations, gameId) {
  const locations = [];
  for (let i = 0; i < count; i++) {
    const loc = await getRandomStreetViewLocation(region, noRandomLocations ? 100 : 150, noRandomLocations, gameId);
    locations.push(loc);
  }
  return locations;
}

function getRegions() {
  return Object.keys(REGION_BOUNDS).map((key) => ({
    id: key,
    label: key.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
  }));
}

module.exports = { getRandomStreetViewLocation, getLocationsForGame, getRegions, clearUsedTowns, clearUsedCountries, markCountryUsed, isCountryUsed, getCountryFromCoords };
