function getExplicitProvider() {
  return (process.env.STREETVIEW_PROVIDER || '').trim().toLowerCase();
}

function hasGoogleKey() {
  const k = process.env.GOOGLE_MAPS_API_KEY;
  return typeof k === 'string' && k.length > 5 && k !== 'your_google_maps_api_key_here';
}

function hasMapillaryToken() {
  const val = process.env.MAPILLARY_ACCESS_TOKEN;
  console.log('[debug] MAPILLARY_ACCESS_TOKEN:', val ? `set (${val.slice(0,6)}...)` : 'MISSING');
  return !!val;
}

// Default if STREETVIEW_PROVIDER is unset:
// - If Google key present -> google
// - Else if Mapillary token present -> mapillary
// - Else -> kartaview
function getDefaultProvider() {
  if (hasGoogleKey()) return 'google';
  if (hasMapillaryToken()) return 'mapillary';
  return 'kartaview';
}

function getConfiguredProvider() {
  const p = getExplicitProvider();
  if (p) return p;
  return getDefaultProvider();
}

module.exports = {
  getExplicitProvider,
  getConfiguredProvider,
  getDefaultProvider,
  hasGoogleKey,
  hasMapillaryToken,
};
