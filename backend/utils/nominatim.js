'use strict';

const { sampleCandidateBatch } = require('./globalCityPool');

const MAX_METERS_FROM_CITY = 4828; // ~3 miles

/**
 * Return a random town-proximate point for the given region.
 * Uses the global city pool (135k+ cities) with small jitter.
 * Kept for API compat with any callers that still use it directly.
 */
function getCityForRegion(region) {
  const [candidate] = sampleCandidateBatch(region, 1, new Set(), true);
  return candidate
    ? { lat: candidate.lat, lng: candidate.lng, name: candidate.name, country: candidate.country }
    : null;
}

/**
 * Return a jittered point near a random city in the region.
 * The jitter is already applied by sampleCandidateBatch (nearTown=true → ≤3 km).
 */
function findNearbyCityLocation(region) {
  return getCityForRegion(region);
}

function getRegionalCities(region) {
  // Returns a sample of 20 cities from the region pool for any caller that needs a list
  return sampleCandidateBatch(region, 20, new Set(), false);
}

module.exports = {
  getCityForRegion,
  findNearbyCityLocation,
  MAX_METERS_FROM_CITY,
  getRegionalCities,
};
