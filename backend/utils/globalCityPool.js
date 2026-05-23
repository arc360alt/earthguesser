'use strict';

// Maps ISO 3166-1 alpha-2 country codes to game regions.
// Countries not listed here are excluded from sampling.
const COUNTRY_TO_REGION = {
  // Europe
  AL: 'europe', AD: 'europe', AM: 'europe', AT: 'europe', AZ: 'europe',
  BY: 'europe', BE: 'europe', BA: 'europe', BG: 'europe', HR: 'europe',
  CY: 'europe', CZ: 'europe', DK: 'europe', EE: 'europe', FI: 'europe',
  FR: 'europe', GE: 'europe', DE: 'europe', GR: 'europe', HU: 'europe',
  IS: 'europe', IE: 'europe', IT: 'europe', XK: 'europe', LV: 'europe',
  LI: 'europe', LT: 'europe', LU: 'europe', MT: 'europe', MD: 'europe',
  MC: 'europe', ME: 'europe', NL: 'europe', MK: 'europe', NO: 'europe',
  PL: 'europe', PT: 'europe', RO: 'europe', RU: 'europe', SM: 'europe',
  RS: 'europe', SK: 'europe', SI: 'europe', ES: 'europe', SE: 'europe',
  CH: 'europe', UA: 'europe', GB: 'europe', VA: 'europe', TR: 'europe',
  FO: 'europe', GI: 'europe', IM: 'europe', JE: 'europe', GG: 'europe',

  // North America
  AG: 'north_america', BS: 'north_america', BB: 'north_america', BZ: 'north_america',
  CA: 'north_america', CR: 'north_america', CU: 'north_america', DM: 'north_america',
  DO: 'north_america', SV: 'north_america', GD: 'north_america', GT: 'north_america',
  HT: 'north_america', HN: 'north_america', JM: 'north_america', MX: 'north_america',
  NI: 'north_america', PA: 'north_america', KN: 'north_america', LC: 'north_america',
  VC: 'north_america', TT: 'north_america', US: 'north_america',
  PR: 'north_america', VI: 'north_america', TC: 'north_america', KY: 'north_america',
  AW: 'north_america', CW: 'north_america', GP: 'north_america', MQ: 'north_america',
  VG: 'north_america', BM: 'north_america',

  // South America
  AR: 'south_america', BO: 'south_america', BR: 'south_america', CL: 'south_america',
  CO: 'south_america', EC: 'south_america', GY: 'south_america', PY: 'south_america',
  PE: 'south_america', SR: 'south_america', UY: 'south_america', VE: 'south_america',
  GF: 'south_america', FK: 'south_america',

  // Asia
  AF: 'asia', BH: 'asia', BD: 'asia', BT: 'asia', BN: 'asia',
  KH: 'asia', CN: 'asia', TL: 'asia', IN: 'asia', ID: 'asia',
  IR: 'asia', IQ: 'asia', IL: 'asia', JP: 'asia', JO: 'asia',
  KZ: 'asia', KP: 'asia', KR: 'asia', KW: 'asia', KG: 'asia',
  LA: 'asia', LB: 'asia', MY: 'asia', MV: 'asia', MN: 'asia',
  MM: 'asia', NP: 'asia', OM: 'asia', PK: 'asia', PS: 'asia',
  PH: 'asia', QA: 'asia', SA: 'asia', SG: 'asia', LK: 'asia',
  SY: 'asia', TW: 'asia', TJ: 'asia', TH: 'asia', TM: 'asia',
  AE: 'asia', UZ: 'asia', VN: 'asia', YE: 'asia',
  HK: 'asia', MO: 'asia',

  // Africa
  DZ: 'africa', AO: 'africa', BJ: 'africa', BW: 'africa', BF: 'africa',
  BI: 'africa', CM: 'africa', CV: 'africa', CF: 'africa', TD: 'africa',
  KM: 'africa', CG: 'africa', CD: 'africa', CI: 'africa', DJ: 'africa',
  EG: 'africa', GQ: 'africa', ER: 'africa', SZ: 'africa', ET: 'africa',
  GA: 'africa', GM: 'africa', GH: 'africa', GN: 'africa', GW: 'africa',
  KE: 'africa', LS: 'africa', LR: 'africa', LY: 'africa', MG: 'africa',
  MW: 'africa', ML: 'africa', MR: 'africa', MU: 'africa', MA: 'africa',
  MZ: 'africa', NA: 'africa', NE: 'africa', NG: 'africa', RW: 'africa',
  ST: 'africa', SN: 'africa', SL: 'africa', SO: 'africa', ZA: 'africa',
  SS: 'africa', SD: 'africa', TZ: 'africa', TG: 'africa', TN: 'africa',
  UG: 'africa', ZM: 'africa', ZW: 'africa', RE: 'africa', YT: 'africa',

  // Oceania
  AU: 'oceania', FJ: 'oceania', KI: 'oceania', MH: 'oceania', FM: 'oceania',
  NR: 'oceania', NZ: 'oceania', PW: 'oceania', PG: 'oceania', WS: 'oceania',
  SB: 'oceania', TO: 'oceania', TV: 'oceania', VU: 'oceania',
  PF: 'oceania', NC: 'oceania', AS: 'oceania', CK: 'oceania', GU: 'oceania',
};

// Coverage quality score per country (0.2–5).
// Used to weight world-mode country selection — higher = more likely to have usable street imagery.
// This does NOT exclude any country; it just adjusts sampling probability.
const COVERAGE_SCORE = {
  US: 5, GB: 5, FR: 5, DE: 5, JP: 5, AU: 5, CA: 5,
  IT: 4, ES: 4, BR: 4, MX: 4, NL: 4, BE: 4, CH: 4,
  SE: 4, NO: 4, DK: 4, FI: 4, AT: 4, IE: 4, PT: 4,
  NZ: 4, SG: 4, HK: 4, KR: 4, TW: 4, ZA: 4,
  PL: 3, CZ: 3, HU: 3, RO: 3, GR: 3, TH: 3, MY: 3,
  IN: 3, CO: 3, CL: 3, PE: 3, IL: 3, TR: 3, GE: 3,
  AM: 3, UA: 3, RU: 3, BG: 3, HR: 3, SK: 3, LT: 3,
  LV: 3, EE: 3, RS: 3, MK: 3, AL: 3, BA: 3, ME: 3,
  ID: 3, PH: 3, VN: 3, AR: 3, UY: 3, EC: 3, GT: 3,
  CR: 3, PA: 3, DO: 3, MA: 3, TN: 3, AE: 3, JO: 3,
  EG: 2, KE: 2, GH: 2, NG: 2, SN: 2, ET: 2, TZ: 2,
  UG: 2, RW: 2, ZM: 2, ZW: 2, BO: 2, PY: 2, KH: 2,
  MM: 2, LA: 2, NP: 2, BD: 2, LK: 2, KZ: 2, SA: 2,
  LB: 2, MZ: 2, NA: 2, CM: 2, CI: 2, VE: 2, MN: 2,
  BY: 2, MD: 2, AZ: 2, KG: 2, TJ: 2, UZ: 2, TM: 2,
  PK: 2, QA: 2, KW: 2, BH: 2, OM: 2, XK: 2, HN: 2,
  NI: 2, SV: 2, GT: 2, CU: 2, JM: 2, TT: 2, GY: 2,
  CN: 1, AF: 1, SY: 1, IQ: 1, YE: 1, SO: 1, CD: 1,
  SD: 1, SS: 1, ER: 1, CF: 1, TD: 1, NE: 1, ML: 1,
  MR: 1, GN: 1, BF: 1, BI: 1, LY: 1, MG: 1, MW: 1,
  KP: 0.2,
};

// Cached data structures, built once on first use
let _groups = null;
let _byCountry = null;
let _weightedWorldCountries = null;

function buildPool() {
  if (_groups) return;

  const allCities = require('all-the-cities');

  const groups = {
    world: [], europe: [], north_america: [], south_america: [],
    asia: [], africa: [], oceania: [],
  };
  const byCountry = {};

  for (const c of allCities) {
    const region = COUNTRY_TO_REGION[c.country];
    if (!region) continue;

    const [lng, lat] = c.loc.coordinates;
    const entry = { lat, lng, name: c.name, country: c.country, population: c.population || 0 };

    groups[region].push(entry);
    groups.world.push(entry);

    if (!byCountry[c.country]) byCountry[c.country] = [];
    byCountry[c.country].push(entry);
  }

  // Build weighted country list for world-mode: each country appears N times
  // proportional to its coverage score, ensuring global diversity.
  const weightedCountries = [];
  for (const [country, cities] of Object.entries(byCountry)) {
    if (!cities.length) continue;
    const score = COVERAGE_SCORE[country] ?? 2;
    const slots = Math.max(1, Math.round(score * 2));
    for (let i = 0; i < slots; i++) weightedCountries.push(country);
  }

  _groups = groups;
  _byCountry = byCountry;
  _weightedWorldCountries = weightedCountries;

  const countryCount = Object.keys(byCountry).length;
  console.log(`[globalCityPool] Loaded ${allCities.length} cities across ${countryCount} countries`);
}

function jitterPoint(lat, lng, maxKm) {
  if (maxKm <= 0) return { lat, lng };
  const km = Math.random() * maxKm;
  const bearing = Math.random() * 2 * Math.PI;
  const dLat = (km / 111) * Math.cos(bearing);
  const cosLat = Math.max(0.1, Math.cos((lat * Math.PI) / 180));
  const dLng = (km / (111 * cosLat)) * Math.sin(bearing);
  return { lat: lat + dLat, lng: lng + dLng };
}

/**
 * Sample a batch of diverse candidate locations for parallel coverage checking.
 *
 * For "world" mode: uses country-first sampling weighted by coverage quality,
 * so every country on Earth has a fair chance regardless of city-count bias.
 *
 * For region modes: picks uniformly from region city pool with country dedup.
 *
 * @param {string}   region           - 'world' | 'europe' | 'north_america' | ...
 * @param {number}   count            - number of candidates to return
 * @param {Set}      excludedCountries - countries already used in this game (skip these)
 * @param {boolean}  nearTown         - true = small jitter (stay near settlement),
 *                                      false = larger jitter (more rural/random feel)
 */
function sampleCandidateBatch(region, count, excludedCountries = new Set(), nearTown = false) {
  buildPool();

  const maxJitterKm = nearTown ? 3 : 25;
  const candidates = [];
  const usedInBatch = new Set();

  function pickForWorld() {
    // Try to pick from a country not yet used in this batch or game
    for (let i = 0; i < 60; i++) {
      const country = _weightedWorldCountries[Math.floor(Math.random() * _weightedWorldCountries.length)];
      if (excludedCountries.has(country)) continue;
      if (usedInBatch.has(country)) continue;
      const list = _byCountry[country];
      if (!list || !list.length) continue;
      return list[Math.floor(Math.random() * list.length)];
    }
    // Fallback: any non-excluded country
    for (let i = 0; i < 30; i++) {
      const country = _weightedWorldCountries[Math.floor(Math.random() * _weightedWorldCountries.length)];
      if (excludedCountries.has(country)) continue;
      const list = _byCountry[country];
      if (!list || !list.length) continue;
      return list[Math.floor(Math.random() * list.length)];
    }
    // Last resort: truly random
    const pool = _groups.world;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function pickForRegion() {
    const pool = _groups[region] || _groups.world;
    for (let i = 0; i < 60; i++) {
      const city = pool[Math.floor(Math.random() * pool.length)];
      if (!excludedCountries.has(city.country) && !usedInBatch.has(city.country)) return city;
    }
    // Relax batch constraint, still honour game-level exclusion
    for (let i = 0; i < 30; i++) {
      const city = pool[Math.floor(Math.random() * pool.length)];
      if (!excludedCountries.has(city.country)) return city;
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  for (let i = 0; i < count; i++) {
    const city = region === 'world' ? pickForWorld() : pickForRegion();
    usedInBatch.add(city.country);
    const { lat, lng } = jitterPoint(city.lat, city.lng, maxJitterKm);
    candidates.push({ lat, lng, name: city.name, country: city.country });
  }

  return candidates;
}

const REGION_DISPLAY_LABELS = {
  europe: 'Europe',
  north_america: 'North America',
  south_america: 'South America',
  asia: 'Asia',
  africa: 'Africa',
  oceania: 'Oceania',
};

function getCountryContinent(countryCode) {
  const region = COUNTRY_TO_REGION[countryCode];
  return REGION_DISPLAY_LABELS[region] || null;
}

function preload() {
  buildPool();
}

module.exports = { sampleCandidateBatch, preload, getCountryContinent };
