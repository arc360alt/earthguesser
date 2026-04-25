const REGION_BOUNDS = {
  world:         { minLat: -60,  maxLat: 75,  minLng: -180, maxLng: 180  },
  europe:        { minLat: 35,   maxLat: 71,  minLng: -25,  maxLng: 40   },
  north_america: { minLat: 15,   maxLat: 72,  minLng: -168, maxLng: -52  },
  south_america: { minLat: -55,  maxLat: 13,  minLng: -82,  maxLng: -34  },
  asia:          { minLat: 5,    maxLat: 55,  minLng: 60,   maxLng: 145  },
  africa:        { minLat: -35,  maxLat: 37,  minLng: -18,  maxLng: 52   },
  oceania:       { minLat: -47,  maxLat: -5,  minLng: 112,  maxLng: 180  },
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

const { checkKartaViewCoverage, probeKartaViewAvailability } = require('../utils/kartaview');
const { checkMapillaryCoverage } = require('../utils/mapillary');
const { getGameplayStreetViewProvider } = require('../utils/activeStreetview');
const { sampleKartaViewCandidateLatLng } = require('./kartaviewSeeds');
const { getCityForRegion, findNearbyCityLocation, MAX_METERS_FROM_CITY } = require('../utils/nominatim');

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
      if (data.location_type === 'indoor') {
        return { found: false };
      }
      const copyright = data.copyright || '';
      const isOfficialGoogle = copyright.includes('Google');
      if (!isOfficialGoogle) {
        return { found: false };
      }
      return {
        found: true,
        lat: data.location.lat,
        lng: data.location.lng,
        panoId: data.pano_id || null
      };
    }
    if (data.status === 'ZERO_RESULTS') {
      return { found: false };
    }
    return { found: false };
  } catch (e) {
    return { found: false };
  }
}

function getMaxAttempts() {
  const n = Number(process.env.STREETVIEW_MAX_ATTEMPTS);
  if (Number.isFinite(n) && n > 0) return Math.min(500, Math.floor(n));
  return 150;
}

async function getRandomStreetViewLocation(region = 'world', maxAttempts, noRandomLocations = false) {
  const bounds = REGION_BOUNDS[region] || REGION_BOUNDS.world;
  const continent = CONTINENT_MAP[region];
  const { provider } = await getGameplayStreetViewProvider();
  const attempts = maxAttempts || getMaxAttempts();

  let cityData = null;
  if (noRandomLocations) {
    cityData = getCityForRegion(region);
    if (!cityData) {
      noRandomLocations = false;
    }
  }

  const actualAttempts = noRandomLocations ? Math.min(attempts, 100) : attempts;

  for (let i = 0; i < actualAttempts; i++) {
    let lat;
    let lng;
    if (noRandomLocations && cityData) {
      const freshCity = getCityForRegion(region);
      const cityResult = findNearbyCityLocation(region, freshCity);
      if (cityResult) {
        lat = cityResult.lat;
        lng = cityResult.lng;
      } else {
        const p = sampleKartaViewCandidateLatLng(region);
        if (p) {
          lat = p.lat;
          lng = p.lng;
        } else {
          lat = bounds.minLat + Math.random() * (bounds.maxLat - bounds.minLat);
          lng = bounds.minLng + Math.random() * (bounds.maxLng - bounds.minLng);
        }
      }
    } else if (provider === 'kartaview' || provider === 'mapillary') {
      const p = sampleKartaViewCandidateLatLng(region);
      if (p) {
        lat = p.lat;
        lng = p.lng;
      } else {
        lat = bounds.minLat + Math.random() * (bounds.maxLat - bounds.minLat);
        lng = bounds.minLng + Math.random() * (bounds.maxLng - bounds.minLng);
      }
    } else {
      lat = bounds.minLat + Math.random() * (bounds.maxLat - bounds.minLat);
      lng = bounds.minLng + Math.random() * (bounds.maxLng - bounds.minLng);
    }

    const result = provider === 'kartaview'
      ? await checkKartaViewCoverage({ lat, lng })
      : provider === 'mapillary'
        ? await checkMapillaryCoverage({ lat, lng })
        : await checkStreetViewCoverage(lat, lng);

    if (result.found) {
      return { lat: result.lat, lng: result.lng, continent, panoId: result.panoId || null };
    }
    if (provider === 'kartaview') {
      await sleep(20);
    }
  }
  const hint = provider === 'kartaview' ? ' KartaView API may be saturated. Try again later or set MAPILLARY_ACCESS_TOKEN.' : '';
  throw new Error(`No Street View coverage found in region "${region}" after ${attempts} attempts.${hint}`);
}

async function getLocationsForGame(region, count, noRandomLocations = false) {
  const locations = [];
  for (let i = 0; i < count; i++) {
    const loc = await getRandomStreetViewLocation(region, noRandomLocations ? 100 : 150, noRandomLocations);
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

module.exports = { getRandomStreetViewLocation, getLocationsForGame, getRegions };