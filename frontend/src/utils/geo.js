export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculateScore(distanceKm) {
  return Math.max(0, Math.min(5000, Math.round(5000 * Math.exp(-distanceKm / 2000))));
}

export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString()} km`;
}

export function scoreColor(score) {
  if (score >= 4500) return '#4caf50';
  if (score >= 3000) return '#8bc34a';
  if (score >= 1500) return '#ffb300';
  if (score >= 500) return '#ff7043';
  return '#e94560';
}

export function scoreLabel(score) {
  if (score >= 4800) return 'Perfect!';
  if (score >= 4000) return 'Excellent!';
  if (score >= 3000) return 'Great!';
  if (score >= 2000) return 'Good';
  if (score >= 1000) return 'Not bad';
  if (score >= 500) return 'Poor';
  return 'Miss!';
}
