 
const GLOBAL_SEEDS = [
  // North America
  { lat: 40.7128, lng: -74.006 }, // NYC
  { lat: 34.0522, lng: -118.2437 }, // LA
  { lat: 41.8781, lng: -87.6298 }, // Chicago
  { lat: 25.7617, lng: -80.1918 }, // Miami
  { lat: 49.2827, lng: -123.1207 }, // Vancouver
  { lat: 45.5017, lng: -73.5673 }, // Montreal
  { lat: 47.6062, lng: -122.3321 }, // Seattle
  { lat: 39.7392, lng: -104.9903 }, // Denver
  { lat: 43.6532, lng: -79.3832 }, // Toronto
  { lat: 51.0447, lng: -114.0719 }, // Calgary
  { lat: 53.5461, lng: -113.4938 }, // Edmonton
  { lat: 49.8954, lng: -97.1384 }, // Winnipeg
  { lat: 19.4326, lng: -99.1332 }, // Mexico City

  // Europe
  { lat: 51.5074, lng: -0.1278 }, // London
  { lat: 48.8566, lng: 2.3522 }, // Paris
  { lat: 52.52, lng: 13.405 }, // Berlin
  { lat: 40.4168, lng: -3.7038 }, // Madrid
  { lat: 41.9028, lng: 12.4964 }, // Rome
  { lat: 59.3293, lng: 18.0686 }, // Stockholm
  { lat: 50.1109, lng: 8.6821 }, // Frankfurt
  { lat: 55.7558, lng: 37.6173 }, // Moscow
  { lat: 45.4642, lng: 9.19 }, // Milan
  { lat: 48.2082, lng: 16.3738 }, // Vienna
  { lat: 52.3676, lng: 4.9041 }, // Amsterdam
  { lat: 53.3498, lng: -6.2603 }, // Dublin
  { lat: 60.1699, lng: 24.9384 }, // Helsinki
  { lat: 41.3851, lng: 2.1734 }, // Barcelona
  { lat: 38.7223, lng: -9.1393 }, // Lisbon
  { lat: 59.9139, lng: 10.7522 }, // Oslo
  { lat: 55.6761, lng: 12.5683 }, // Copenhagen
  { lat: 46.0514, lng: 14.506 }, // Ljubljana
  { lat: 45.8150, lng: 15.9819 }, // Zagreb

  // Asia (expanded - includes Middle East, Southeast Asia, Central Asia)
  { lat: 35.6762, lng: 139.6503 }, // Tokyo
  { lat: 37.5665, lng: 126.978 }, // Seoul
  { lat: 22.3193, lng: 114.1694 }, // Hong Kong
  { lat: 39.9042, lng: 116.4074 }, // Beijing
  { lat: 31.2304, lng: 121.4737 }, // Shanghai
  { lat: 1.3521, lng: 103.8198 }, // Singapore
  { lat: 13.7563, lng: 100.5018 }, // Bangkok
  { lat: 28.6139, lng: 77.209 }, // Delhi
  { lat: 19.076, lng: 72.8777 }, // Mumbai
  { lat: 3.1390, lng: 101.6869 }, // Kuala Lumpur
  { lat: -6.2088, lng: 106.8456 }, // Jakarta
  { lat: 14.5995, lng: 120.9842 }, // Manila
  { lat: 16.8661, lng: 96.1951 }, // Yangon
  { lat: 21.0285, lng: 105.8542 }, // Hanoi
  { lat: 10.8231, lng: 106.6297 }, // Ho Chi Minh City
  { lat: 24.7136, lng: 46.6753 }, // Riyadh
  { lat: 25.2048, lng: 55.2708 }, // Dubai
  { lat: 31.7683, lng: 35.2137 }, // Jerusalem
  { lat: 33.3152, lng: 44.3661 }, // Baghdad
  { lat: 35.6892, lng: 51.3890 }, // Tehran
  { lat: 41.7151, lng: 44.8271 }, // Tbilisi
  { lat: 40.1776, lng: 44.5126 }, // Yerevan
  { lat: 51.1605, lng: 71.4704 }, // Nur-Sultan (Astana)
  { lat: 43.2220, lng: 76.8512 }, // Almaty

  // Africa (expanded)
  { lat: 31.2357, lng: 30.0444 }, // Cairo
  { lat: -33.9249, lng: 18.4241 }, // Cape Town
  { lat: -1.2921, lng: 36.8219 }, // Nairobi
  { lat: 9.0222, lng: 38.7468 }, // Addis Ababa
  { lat: 34.0209, lng: -6.8416 }, // Rabat
  { lat: 6.5244, lng: 3.3792 }, // Lagos
  { lat: -26.2041, lng: 28.0473 }, // Johannesburg
  { lat: 33.5731, lng: -7.5898 }, // Casablanca
  { lat: -15.3875, lng: 28.3228 }, // Lusaka

  // South America (expanded)
  { lat: -23.5505, lng: -46.6333 }, // São Paulo
  { lat: -34.6037, lng: -58.3816 }, // Buenos Aires
  { lat: 4.711, lng: -74.0721 }, // Bogotá
  { lat: -12.0464, lng: -77.0428 }, // Lima
  { lat: -33.4489, lng: -70.6693 }, // Santiago
  { lat: -16.5000, lng: -68.1500 }, // La Paz
  { lat: -0.1807, lng: -78.4678 }, // Quito
  { lat: 10.4806, lng: -66.9036 }, // Caracas

  // Oceania (expanded)
  { lat: -33.8688, lng: 151.2093 }, // Sydney
  { lat: -36.8509, lng: 174.7645 }, // Auckland
  { lat: -37.8136, lng: 144.9631 }, // Melbourne
  { lat: -27.4698, lng: 153.0251 }, // Brisbane
  { lat: -31.9505, lng: 115.8605 }, // Perth
  { lat: -41.2865, lng: 174.7762 }, // Wellington
];

const BY_REGION = {
  world: GLOBAL_SEEDS,
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
    { lat: 41.3851, lng: 2.1734 }, // Barcelona
    { lat: 38.7223, lng: -9.1393 }, // Lisbon
    { lat: 59.9139, lng: 10.7522 }, // Oslo
    { lat: 55.6761, lng: 12.5683 }, // Copenhagen
    { lat: 46.0514, lng: 14.506 }, // Ljubljana
    { lat: 45.8150, lng: 15.9819 }, // Zagreb
    { lat: 42.6977, lng: 23.3219 }, // Sofia
    { lat: 41.9028, lng: 12.4964 }, // Rome
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
    { lat: 43.6532, lng: -79.3832 }, // Toronto
    { lat: 51.0447, lng: -114.0719 }, // Calgary
    { lat: 53.5461, lng: -113.4938 }, // Edmonton
    { lat: 49.8954, lng: -97.1384 }, // Winnipeg
    { lat: 19.4326, lng: -99.1332 }, // Mexico City
    { lat: 19.4326, lng: -99.1332 }, // Mexico City
  ],
  south_america: [
    { lat: -23.5505, lng: -46.6333 }, // São Paulo
    { lat: -34.6037, lng: -58.3816 }, // Buenos Aires
    { lat: 4.711, lng: -74.0721 }, // Bogotá
    { lat: -12.0464, lng: -77.0428 }, // Lima
    { lat: -33.4489, lng: -70.6693 }, // Santiago
    { lat: -16.5000, lng: -68.1500 }, // La Paz
    { lat: -0.1807, lng: -78.4678 }, // Quito
    { lat: 10.4806, lng: -66.9036 }, // Caracas
    { lat: -34.9011, lng: -56.1645 }, // Montevideo
  ],
  asia: [
    // East Asia
    { lat: 35.6762, lng: 139.6503 }, // Tokyo
    { lat: 37.5665, lng: 126.978 }, // Seoul
    { lat: 39.9042, lng: 116.4074 }, // Beijing
    { lat: 31.2304, lng: 121.4737 }, // Shanghai
    { lat: 35.6762, lng: 139.6503 }, // Tokyo
    // Southeast Asia
    { lat: 1.3521, lng: 103.8198 }, // Singapore
    { lat: 13.7563, lng: 100.5018 }, // Bangkok
    { lat: 3.1390, lng: 101.6869 }, // Kuala Lumpur
    { lat: -6.2088, lng: 106.8456 }, // Jakarta
    { lat: 14.5995, lng: 120.9842 }, // Manila
    { lat: 16.8661, lng: 96.1951 }, // Yangon
    { lat: 21.0285, lng: 105.8542 }, // Hanoi
    { lat: 10.8231, lng: 106.6297 }, // Ho Chi Minh City
    // South Asia
    { lat: 28.6139, lng: 77.209 }, // Delhi
    { lat: 19.076, lng: 72.8777 }, // Mumbai
    { lat: 23.8103, lng: 90.4125 }, // Dhaka
    { lat: 27.7172, lng: 85.3240 }, // Kathmandu
    // Middle East / Central Asia
    { lat: 25.2048, lng: 55.2708 }, // Dubai
    { lat: 24.7136, lng: 46.6753 }, // Riyadh
    { lat: 31.7683, lng: 35.2137 }, // Jerusalem
    { lat: 33.3152, lng: 44.3661 }, // Baghdad
    { lat: 35.6892, lng: 51.3890 }, // Tehran
    { lat: 41.7151, lng: 44.8271 }, // Tbilisi
    { lat: 40.1776, lng: 44.5126 }, // Yerevan
    { lat: 51.1605, lng: 71.4704 }, // Nur-Sultan
    { lat: 43.2220, lng: 76.8512 }, // Almaty
  ],
  africa: [
    { lat: 31.2357, lng: 30.0444 }, // Cairo
    { lat: -33.9249, lng: 18.4241 }, // Cape Town
    { lat: -1.2921, lng: 36.8219 }, // Nairobi
    { lat: 9.0222, lng: 38.7468 }, // Addis Ababa
    { lat: 34.0209, lng: -6.8416 }, // Rabat
    { lat: 6.5244, lng: 3.3792 }, // Lagos
    { lat: -26.2041, lng: 28.0473 }, // Johannesburg
    { lat: 33.5731, lng: -7.5898 }, // Casablanca
    { lat: -15.3875, lng: 28.3228 }, // Lusaka
    { lat: 14.7167, lng: -17.4677 }, // Dakar
    { lat: -1.9441, lng: 30.0619 }, // Kigali
  ],
  oceania: [
    { lat: -33.8688, lng: 151.2093 }, // Sydney
    { lat: -36.8509, lng: 174.7645 }, // Auckland
    { lat: -37.8136, lng: 144.9631 }, // Melbourne
    { lat: -27.4698, lng: 153.0251 }, // Brisbane
    { lat: -31.9505, lng: 115.8605 }, // Perth
    { lat: -41.2865, lng: 174.7762 }, // Wellington
    { lat: -12.4634, lng: 130.8456 }, // Darwin
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
  const useSeed = Math.random() < 0.3;
  if (useSeed) {
    const s = seeds[Math.floor(Math.random() * seeds.length)];
    return jitterPoint(s, 18);
  }

  // Fallback: pure random in bounds (keeps the old behavior, but rarer)
  return null;
}

module.exports = { sampleKartaViewCandidateLatLng, BY_REGION, GLOBAL_SEEDS };
