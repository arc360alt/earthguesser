const { BY_REGION } = require('../models/kartaviewSeeds');
const MAX_METERS_FROM_CITY = 4828; // ~3 miles

// Overpass API to get random populated places (towns/cities)
async function fetchRandomTown(region = 'world') {
  const bounds = getBoundsForRegion(region);
  if (!bounds) return null;

  // Try up to 3 times with different random points
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Generate random lat/lng within bounds for the query
      const lat = bounds.minLat + Math.random() * (bounds.maxLat - bounds.minLat);
      const lng = bounds.minLng + Math.random() * (bounds.maxLng - bounds.minLng);

      // Use a larger search radius (~500km box) to get more results
      const searchRadius = 5.0;
      const minLat = Math.max(bounds.minLat, lat - searchRadius);
      const maxLat = Math.min(bounds.maxLat, lat + searchRadius);
      const minLng = Math.max(bounds.minLng, lng - searchRadius);
      const maxLng = Math.min(bounds.maxLng, lng + searchRadius);

      // Query Overpass API for towns/cities in the area
      const query = `[out:json][timeout:30];(node[place~'town|city|village'](${minLat},${minLng},${maxLat},${maxLng});way[place~'town|city|village'](${minLat},${minLng},${maxLat},${maxLng}););out center;`;

      // Add timeout to fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
        headers: { 'User-Agent': 'EarthGuesser/1.0' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await res.json();

      if (data.elements && data.elements.length > 0) {
        // Pick a random settlement
        const place = data.elements[Math.floor(Math.random() * data.elements.length)];
        const placeLat = place.lat || place.center?.lat;
        const placeLng = place.lon || place.center?.lon;

        if (!placeLat || !placeLng) continue;

        // Add jitter within ~3 miles
        const jitterKm = Math.random() * MAX_METERS_FROM_CITY / 1000;
        const offsetLat = (jitterKm / 111) * (Math.random() - 0.5) * 2;
        const lngAdjustment = Math.max(0.5, Math.cos((placeLat * Math.PI) / 180));
        const offsetLng = (jitterKm / (111 * lngAdjustment)) * (Math.random() - 0.5) * 2;

        return {
          lat: placeLat + offsetLat,
          lng: placeLng + offsetLng,
          cityName: place.tags?.name || null
        };
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        console.log('Overpass API timeout, retrying...');
      } else {
        console.error('Overpass API fetch failed:', e.message);
      }
    }
  }
  return null;
}

function getBoundsForRegion(region) {
  const REGION_BOUNDS = {
    world:         { minLat: -60,  maxLat: 75,  minLng: -180, maxLng: 180  },
    europe:        { minLat: 35,   maxLat: 71,  minLng: -25,  maxLng: 40   },
    north_america: { minLat: 15,   maxLat: 72,  minLng: -168, maxLng: -52  },
    south_america: { minLat: -55,  maxLat: 13,  minLng: -82,  maxLng: -34  },
    asia:          { minLat: 5,    maxLat: 55,  minLng: 60,   maxLng: 145  },
    africa:        { minLat: -35,  maxLat: 37,  minLng: -18,  maxLng: 52   },
    oceania:       { minLat: -47,  maxLat: -5,  minLng: 112,  maxLng: 180  },
  };
  return REGION_BOUNDS[region] || REGION_BOUNDS.world;
}

function findNearbyCityLocation(region) {
  const cities = BY_REGION[region] || BY_REGION.world;
  if (cities.length === 0) {
    return null;
  }

  const city = cities[Math.floor(Math.random() * cities.length)];
  const cityLat = city.lat;
  const cityLng = city.lng;

  const jitterKm = Math.random() * MAX_METERS_FROM_CITY / 1000;
  const maxOffsetLat = jitterKm / 111;
  const maxOffsetLng = jitterKm / (111 * Math.max(0.5, Math.cos((cityLat * Math.PI) / 180)));

  const lat = cityLat + (Math.random() - 0.5) * 2 * maxOffsetLat;
  const lng = cityLng + (Math.random() - 0.5) * 2 * maxOffsetLng;

  return { lat, lng, cityName: null };
}

function getCityForRegion(region) {
  const cities = BY_REGION[region] || BY_REGION.world;
  if (cities.length === 0) {
    return null;
  }
  return cities[Math.floor(Math.random() * cities.length)];
}

function getRegionalCities(region) {
  return BY_REGION[region] || BY_REGION.world;
}

module.exports = {
  getCityForRegion,
  findNearbyCityLocation,
  MAX_METERS_FROM_CITY,
  getRegionalCities,
  fetchRandomTown,
};