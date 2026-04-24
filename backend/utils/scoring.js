const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

// Score curve: 5000 for perfect (<0.5km), exponential decay, ~0 at 5000km+
function calculateScore(distanceKm, multiplier = 1) {
  const raw = Math.round(5000 * Math.exp(-distanceKm / 2000));
  const clamped = Math.max(0, Math.min(5000, raw));
  return Math.round(clamped * multiplier);
}

// Points earned for the economy (separate from game score)
function calculateEarnedPoints(gameScore, roundCount) {
  return Math.round((gameScore / (roundCount * 5000)) * 100);
}

module.exports = { haversineDistance, calculateScore, calculateEarnedPoints };
