// Shared KartaView / OpenStreetCam client helpers.
// The public API is sometimes flaky; callers should use retries and avoid hammering it.

const DEFAULT_UA = 'EarthGuesser/1.0 (+https://github.com)';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function debugEnabled() {
  return String(process.env.KARTAVIEW_DEBUG || '').toLowerCase() === '1' || String(process.env.KARTAVIEW_DEBUG || '').toLowerCase() === 'true';
}

function dlog(...args) {
  if (debugEnabled()) console.log('[KartaView]', ...args);
}

function isOkEnvelope(data) {
  // Common shapes: { status: { httpCode, apiCode, ... } } OR top-level { httpCode, apiCode }
  const s = data?.status || data;
  const http = s?.httpCode ?? s?.code;
  const api = s?.apiCode;
  if (http === 200 && (api == null || api === 0)) return true;
  if (data?.result && Array.isArray(data.result)) {
    // Some versions omit status; accept non-empty result.
    return true;
  }
  if (data?.osv) return true; // v1 style sometimes
  return false;
}

function extractItems(data) {
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data.result)) return data.result;
  if (Array.isArray(data.currentPageItems)) return data.currentPageItems;
  if (data.osv) {
    const osv = data.osv;
    if (Array.isArray(osv?.photos)) return osv.photos;
    if (Array.isArray(osv?.data)) return osv.data;
  }
  return [];
}

function pickLatLng(item) {
  const lat = item?.lat ?? item?.latitude ?? item?.gps?.lat ?? item?.location?.lat;
  const lng = item?.lng ?? item?.longitude ?? item?.gps?.lng ?? item?.location?.lng;
  if (typeof lat === 'number' && typeof lng === 'number') return { lat, lng };
  if (typeof lat === 'string' && typeof lng === 'string') {
    const la = Number(lat);
    const ln = Number(lng);
    if (Number.isFinite(la) && Number.isFinite(ln)) return { lat: la, lng: ln };
  }
  return null;
}

function isSphereish(item) {
  const p = (item?.projection || item?.Projection || item?.imageProjection || '').toString().toUpperCase();
  if (p.includes('SPHERE') || p.includes('EQUIRECT') || p.includes('PANORAMA')) return true;
  if (item?.pano === true) return true;
  if (item?.isPano === true) return true;
  const fov = Number(item?.fieldOfView ?? item?.fov);
  if (Number.isFinite(fov) && fov >= 300) return true;
  return false;
}

function pickImageUrl(item) {
  const direct =
    item?.imageUrl ||
    item?.photoUrl ||
    item?.url ||
    item?.fileUrl ||
    item?.fullUrl ||
    item?.largeUrl;
  if (typeof direct === 'string' && direct.startsWith('http')) return direct;

  const rel = item?.filePath || item?.path || item?.file_name || item?.filename || item?.name;
  if (typeof rel === 'string') {
    if (rel.startsWith('/')) return `https://api.openstreetcam.org${rel}`;
    if (rel.startsWith('files/')) return `https://api.openstreetcam.org/${rel}`;
  }
  return null;
}

function bestPhotoItem(items, { requireSphere }) {
  if (!Array.isArray(items) || !items.length) return null;
  if (requireSphere) {
    const panos = items.filter(isSphereish);
    if (panos.length) {
      for (const it of panos) {
        const pos = pickLatLng(it);
        if (pos) return { item: it, pos };
      }
    }
  }
  for (const it of items) {
    const pos = pickLatLng(it);
    if (pos) return { item: it, pos };
  }
  return null;
}

async function fetchJsonWithTimeout(url, { timeoutMs, headers = {} } = {}) {
  const tMs =
    Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0
      ? Number(timeoutMs)
      : Number.isFinite(Number(process.env.KARTAVIEW_FETCH_TIMEOUT_MS))
        ? Number(process.env.KARTAVIEW_FETCH_TIMEOUT_MS)
        : 30000;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), tMs);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: {
        'User-Agent': process.env.KARTAVIEW_USER_AGENT || DEFAULT_UA,
        Accept: 'application/json',
        ...headers,
      },
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { _nonJson: true, text: text?.slice(0, 200) };
    }
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(t);
  }
}

function isRetryableKartaViewFailure(data) {
  const msg = (data?.status?.apiMessage || data?.apiMessage || '').toString();
  if (/max_user_connections/i.test(msg)) return true;
  if (/connection/i.test(msg) && /exceeded/i.test(msg)) return true;
  if (/mysql server has gone away/i.test(msg)) return true;
  if (/gone away/i.test(msg)) return true;
  if (/empty response/i.test(msg)) return true;
  if (/try again/i.test(msg)) return true;
  if (data?._nonJson) return true;
  const code = data?.status?.apiCode;
  if (code === 601) return true; // commonly "empty response" on their side
  return false;
}

function isLikelyKartaViewServiceOutage(data) {
  const msg = (data?.status?.apiMessage || data?.apiMessage || '').toString();
  if (/max_user_connections/i.test(msg)) return true;
  if (/mysql server has gone away/i.test(msg)) return true;
  if (/exceeded the 'max_user_connections' resource/i.test(msg)) return true;
  if (/ An unexpected server error has occurred/i.test(msg)) return true; // v1 690s sometimes
  return false;
}

let kartaViewProbeCache = { at: 0, result: null, ttlMs: 30_000 };

async function probeKartaViewAvailability() {
  if (String(process.env.KARTAVIEW_SKIP_PROBE || '').toLowerCase() === '1') return { ok: true, skipped: true };

  const now = Date.now();
  if (kartaViewProbeCache.result && now - kartaViewProbeCache.at < kartaViewProbeCache.ttlMs) {
    return kartaViewProbeCache.result;
  }

  // Cheap request to a well-covered city; if this is failing, random sampling is almost never going to work.
  const u = new URL('https://api.openstreetcam.org/2.0/photo/');
  u.searchParams.set('lat', '40.7128');
  u.searchParams.set('lng', '-74.0060');
  u.searchParams.set('radius', '5000');
  u.searchParams.set('zoomLevel', '16');
  u.searchParams.set('limit', '1');
  u.searchParams.set('orderBy', 'distance');
  u.searchParams.set('orderDirection', 'asc');

  let data;
  try {
    // eslint-disable-next-line no-await-in-loop
    const r = await fetchJsonWithTimeout(u.toString());
    data = r.data;
  } catch (e) {
    const out = {
      ok: false,
      reason: 'network_timeout',
      detail: e?.name || e?.code || String(e),
    };
    kartaViewProbeCache = { at: now, result: out, ttlMs: 10_000 };
    return out;
  }

  const items = extractItems(data);
  if (items.length) {
    const out = { ok: true };
    kartaViewProbeCache = { at: now, result: out, ttlMs: kartaViewProbeCache.ttlMs };
    return out;
  }

  if (data && isLikelyKartaViewServiceOutage(data)) {
    const msg = (data?.status?.apiMessage || data?.apiMessage || 'KartaView API error').toString();
    const out = { ok: false, reason: 'service_unavailable', detail: msg };
    kartaViewProbeCache = { at: now, result: out, ttlMs: 10_000 };
    return out;
  }

  const out = { ok: true, weak: true };
  kartaViewProbeCache = { at: now, result: out, ttlMs: 10_000 };
  return out;
}

async function photoSearch({ lat, lng, radius, limit, options }) {
  const requireSphere = options?.requireSphere === true;
  const preferJoin = options?.preferJoin === true; // if false, we try without join first

  const makeUrl = (useJoin) => {
    const u = new URL('https://api.openstreetcam.org/2.0/photo/');
    u.searchParams.set('lat', String(lat));
    u.searchParams.set('lng', String(lng));
    u.searchParams.set('radius', String(radius));
    u.searchParams.set('zoomLevel', '16');
    u.searchParams.set('limit', String(limit));
    u.searchParams.set('orderBy', 'distance');
    u.searchParams.set('orderDirection', 'asc');

    if (requireSphere) {
      u.searchParams.set('projection', 'SPHERE');
      u.searchParams.set('fieldOfView', '360');
    }

    if (useJoin) u.searchParams.set('join', 'sequence');
    return u;
  };

  // Two-step strategy:
  // 1) Without join=sequence (usually cheaper / less load on their DB)
  // 2) With join=sequence (sometimes returns richer data)
  const order = preferJoin ? [true, false] : [false, true];

  for (const useJoin of order) {
    const u = makeUrl(useJoin);
    dlog('GET', u.toString());

    for (let attempt = 0; attempt < 5; attempt++) {
      // eslint-disable-next-line no-await-in-loop
      let last;
      try {
        last = await fetchJsonWithTimeout(u.toString());
      } catch (e) {
        // undici: AbortError on timeout, transient network flakiness, etc.
        dlog('fetch error', e?.name || e?.code || e);
        // eslint-disable-next-line no-await-in-loop
        await sleep(350 * 2 ** attempt);
        continue;
      }
      const { data, status } = last;

      if (status >= 500) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(200 * 2 ** attempt);
        continue;
      }

      if (data && isRetryableKartaViewFailure(data)) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(300 * 2 ** attempt);
        continue;
      }

      // If the envelope is "bad" but we still have items, accept it.
      const items = extractItems(data);
      if (items.length) {
        const best = bestPhotoItem(items, { requireSphere });
        if (best) return { ok: true, data, items, picked: best };
        // Got a response w/ no usable lat/lng; try next join mode
        break;
      }
    }
  }

  return { ok: false, error: 'no_items' };
}

async function nearestKartaViewPhoto(
  { lat, lng, radius, limit = 20 },
  options = { requireSphere: null }
) {
  const requireSphereFromEnv =
    String(process.env.KARTAVIEW_360_ONLY || 'false').toLowerCase() === '1' ||
    String(process.env.KARTAVIEW_360_ONLY || 'false').toLowerCase() === 'true';
  const requireSphere =
    options?.requireSphere === true ? true : options?.requireSphere === false ? false : requireSphereFromEnv;

  // Stage A: any nearby photo, prefer 360
  const any = await photoSearch({ lat, lng, radius, limit, options: { requireSphere: false, noJoin: false } });
  if (any?.picked) {
    const { item, pos } = any.picked;
    if (!requireSphere || isSphereish(item)) {
      return {
        found: true,
        id: item.id ?? item.photoId ?? null,
        lat: pos.lat,
        lng: pos.lng,
        imageUrl: pickImageUrl(item),
        projection: (item?.projection || '').toString() || null,
        sequenceId: item.sequenceId ?? item.sequence_id ?? item.sequence?.id ?? null,
        sequenceIndex: item.sequenceIndex ?? item.sequence_index ?? null,
        heading: item.heading ?? item.yaw ?? null,
      };
    }
  }

  if (requireSphere) {
    // Stage B: explicit sphere query
    const sph = await photoSearch({ lat, lng, radius, limit, options: { requireSphere: true, noJoin: false } });
    if (sph?.picked) {
      const { item, pos } = sph.picked;
      return {
        found: true,
        id: item.id ?? item.photoId ?? null,
        lat: pos.lat,
        lng: pos.lng,
        imageUrl: pickImageUrl(item),
        projection: (item?.projection || '').toString() || 'SPHERE',
        sequenceId: item.sequenceId ?? item.sequence_id ?? item.sequence?.id ?? null,
        sequenceIndex: item.sequenceIndex ?? item.sequence_index ?? null,
        heading: item.heading ?? item.yaw ?? null,
      };
    }
  }

  return { found: false };
}

async function checkKartaViewCoverage({ lat, lng, radiuses = [5000, 15000, 30000] }) {
  const requireSphereFromEnv =
    String(process.env.KARTAVIEW_360_ONLY || 'false').toLowerCase() === '1' ||
    String(process.env.KARTAVIEW_360_ONLY || 'false').toLowerCase() === 'true';
  for (const r of radiuses) {
    // eslint-disable-next-line no-await-in-loop
    const p = await nearestKartaViewPhoto(
      { lat, lng, radius: r, limit: 10 },
      { requireSphere: requireSphereFromEnv ? true : false }
    );
    if (p.found) return { found: true, lat: p.lat, lng: p.lng };
  }
  return { found: false };
}

module.exports = {
  nearestKartaViewPhoto,
  checkKartaViewCoverage,
  extractItems,
  isOkEnvelope,
  pickImageUrl,
  probeKartaViewAvailability,
};
