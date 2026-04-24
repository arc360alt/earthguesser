const { BY_REGION } = require('../models/kartaviewSeeds');
const MAX_METERS_FROM_CITY = 4828; // ~3 miles

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
};