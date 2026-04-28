
const GLOBAL_SEEDS = [
  { lat: 40.7128, lng: -74.006 }, // NYC
  { lat: 34.0522, lng: -118.2437 }, // LA
  { lat: 41.8781, lng: -87.6298 }, // Chicago
  { lat: 25.7617, lng: -80.1918 }, // Miami
  { lat: 49.2827, lng: -123.1207 }, // Vancouver
  { lat: 45.5017, lng: -73.5673 }, // Montreal
  { lat: 51.5074, lng: -0.1278 }, // London
  { lat: 48.8566, lng: 2.3522 }, // Paris
  { lat: 52.52, lng: 13.405 }, // Berlin
  { lat: 40.4168, lng: -3.7038 }, // Madrid
  { lat: 41.9028, lng: 12.4964 }, // Rome
  { lat: 59.3293, lng: 18.0686 }, // Stockholm
  { lat: 50.1109, lng: 8.6821 }, // Frankfurt
  { lat: 55.7558, lng: 37.6173 }, // Moscow
  { lat: 19.4326, lng: -99.1332 }, // Mexico City
  { lat: 35.6762, lng: 139.6503 }, // Tokyo
  { lat: 37.5665, lng: 126.978 }, // Seoul
  { lat: 22.3193, lng: 114.1694 }, // Hong Kong
  { lat: 39.9042, lng: 116.4074 }, // Beijing
  { lat: 31.2304, lng: 121.4737 }, // Shanghai
  { lat: 1.3521, lng: 103.8198 }, // Singapore
  { lat: 13.7563, lng: 100.5018 }, // Bangkok
  { lat: 25.2048, lng: 55.2708 }, // Dubai
  { lat: 28.6139, lng: 77.209 }, // Delhi
  { lat: 19.076, lng: 72.8777 }, // Mumbai
  { lat: 31.2357, lng: 30.0444 }, // Cairo
  { lat: -33.9249, lng: 18.4241 }, // Cape Town
  { lat: -23.5505, lng: -46.6333 }, // São Paulo
  { lat: -34.6037, lng: -58.3816 }, // Buenos Aires
  { lat: 4.711, lng: -74.0721 }, // Bogotá
  { lat: -12.0464, lng: -77.0428 }, // Lima
  { lat: -33.8688, lng: 151.2093 }, // Sydney
  { lat: -36.8509, lng: 174.7645 }, // Auckland
];

const BY_REGION = {
  world: GLOBAL_SEEDS,
  europe: [
    { lat: 48.8566, lng: 2.3522 },
    { lat: 51.5074, lng: -0.1278 },
    { lat: 52.52, lng: 13.405 },
    { lat: 50.1109, lng: 8.6821 },
    { lat: 41.9028, lng: 12.4964 },
    { lat: 40.4168, lng: -3.7038 },
    { lat: 45.4642, lng: 9.19 },
    { lat: 59.3293, lng: 18.0686 },
  ],
  north_america: [
    { lat: 40.7128, lng: -74.006 }, // NYC
    { lat: 34.0522, lng: -118.2437 }, // LA
    { lat: 41.8781, lng: -87.6298 }, // Chicago
    { lat: 25.7617, lng: -80.1918 }, // Miami
    { lat: 47.6062, lng: -122.3321 }, // Seattle
    { lat: 39.7392, lng: -104.9903 }, // Denver
    { lat: 39.9526, lng: -75.1652 }, // Philadelphia
    { lat: 42.3601, lng: -71.0589 }, // Boston
    { lat: 49.2827, lng: -123.1207 }, // Vancouver
    { lat: 45.5017, lng: -73.5673 }, // Montreal
    { lat: 19.4326, lng: -99.1332 }, // Mexico City
  ],
  europe: [
    { lat: 51.5074, lng: -0.1278 }, // London
    { lat: 48.8566, lng: 2.3522 }, // Paris
    { lat: 52.52, lng: 13.405 }, // Berlin
    { lat: 40.4168, lng: -3.7038 }, // Madrid
    { lat: 41.9028, lng: 12.4964 }, // Rome
    { lat: 45.4642, lng: 9.19 }, // Milan
    { lat: 59.3293, lng: 18.0686 }, // Stockholm
    { lat: 55.7558, lng: 37.6173 }, // Moscow
    { lat: 50.1109, lng: 8.6821 }, // Frankfurt
    { lat: 50.9375, lng: 6.9603 }, // Cologne
    { lat: 48.2082, lng: 16.3738 }, // Vienna
    { lat: 52.3676, lng: 4.9041 }, // Amsterdam
    { lat: 53.3498, lng: -6.2603 }, // Dublin
    { lat: 60.1699, lng: 24.9384 }, // Helsinki
  ],
  south_america: [
    { lat: -23.5505, lng: -46.6333 }, // São Paulo
    { lat: -34.6037, lng: -58.3816 }, // Buenos Aires
    { lat: 4.711, lng: -74.0721 }, // Bogotá
    { lat: -12.0464, lng: -77.0428 }, // Lima
    { lat: -33.4489, lng: -70.6693 }, // Santiago
  ],
  asia: [
    { lat: 35.6762, lng: 139.6503 },
    { lat: 37.5665, lng: 126.978 },
    { lat: 22.3193, lng: 114.1694 },
    { lat: 1.3521, lng: 103.8198 },
    { lat: 25.2048, lng: 55.2708 },
    { lat: 28.6139, lng: 77.209 },
  ],
  africa: [
    { lat: 33.5731, lng: -7.5898 },
    { lat: 31.2357, lng: 30.0444 },
    { lat: -1.2921, lng: 36.8219 },
    { lat: -33.9249, lng: 18.4241 },
  ],
  oceania: [
    { lat: -33.8688, lng: 151.2093 },
    { lat: -36.8509, lng: 174.7645 },
  ],
};

function randBetween(min, max) {
  return min + Math.random() * (max - min);
}

function jitterPoint(p, maxKm = 12) {
  // Rough: 1 deg lat ~ 111km
  const dLat = (maxKm / 111000) * randBetween(-1, 1);
  const dLng = (maxKm / 111000) * randBetween(-1, 1) / Math.max(0.2, Math.cos((p.lat * Math.PI) / 180));
  return { lat: p.lat + dLat, lng: p.lng + dLng };
}

function sampleKartaViewCandidateLatLng(region) {
  const seeds = BY_REGION[region] || BY_REGION.world;
  const useSeed = Math.random() < 0.8;
  if (useSeed) {
    const s = seeds[Math.floor(Math.random() * seeds.length)];
    return jitterPoint(s, 18);
  }

  // Fallback: pure random in bounds (keeps the old behavior, but rarer)
  return null;
}

module.exports = { sampleKartaViewCandidateLatLng, BY_REGION, GLOBAL_SEEDS };
