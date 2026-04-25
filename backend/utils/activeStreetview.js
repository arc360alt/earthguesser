const { getConfiguredProvider, hasMapillaryToken, hasGoogleKey } = require('./streetviewProvider');
const { probeKartaViewAvailability } = require('./kartaview');

let warnedFailover = false;

function failoverEnabled() {
  const v = String(process.env.STREETVIEW_FAILOVER || '1').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

// Chooses the provider used for BOTH:
// - location generation (round coords)
// - the frontend viewer (via /api/streetview)
//
// KartaView can be down independently of "coverage" — if it's globally erroring, fall back to Mapillary
// (when a token is available) to keep the game playable.
async function getGameplayStreetViewProvider() {
  const configured = getConfiguredProvider();

  // If explicitly configured, still allow kartaview -> mapillary soft failover
  if (configured === 'kartaview' && failoverEnabled() && hasMapillaryToken()) {
    // eslint-disable-next-line no-await-in-loop
    const probe = await probeKartaViewAvailability();
    if (!probe.ok) {
      if (!warnedFailover) {
        warnedFailover = true;
        // eslint-disable-next-line no-console
        console.warn(
          `[streetview] KartaView is unhealthy; failing over to Mapillary. (set STREETVIEW_FAILOVER=0 to disable)`
        );
      }
      return { provider: 'mapillary', configured, failoverFrom: 'kartaview' };
    }
  }

  // Sensible hard checks for partially configured envs
  if (configured === 'google' && !hasGoogleKey()) {
    if (hasMapillaryToken()) return { provider: 'mapillary', configured, note: 'google_key_missing' };
    return { provider: 'kartaview', configured, note: 'google_key_missing' };
  }

  if (configured === 'mapillary' && !hasMapillaryToken()) {
    if (hasGoogleKey()) return { provider: 'google', configured, note: 'mapillary_token_missing' };
    return { provider: 'kartaview', configured, note: 'mapillary_token_missing' };
  }

  return { provider: configured, configured, failoverFrom: null };
}

module.exports = { getGameplayStreetViewProvider, failoverEnabled };
