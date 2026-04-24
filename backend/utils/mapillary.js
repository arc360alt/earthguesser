// Mapillary Graph API helper (server-side only; do not ship tokens to browsers).

const DEFAULT_UA = 'EarthGuesser/1.0';

function getAccessToken() {
  return process.env.MAPILLARY_ACCESS_TOKEN;
}

function getClientSecret() {
  return process.env.MAPILLARY_CLIENT_SECRET;
}

function pointFromImage(img) {
  const cg = img?.computed_geometry;
  const g = img?.geometry;
  const p = cg?.type === 'Point' ? cg?.coordinates : g?.type === 'Point' ? g?.coordinates : null;
  if (Array.isArray(p) && p.length >= 2) {
    const lng = Number(p[0]);
    const lat = Number(p[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return null;
}

async function mapillaryImagesSearch({ lat, lng, radius, limit = 3 }) {
  const accessToken = getAccessToken();
  const clientSecret = getClientSecret();
  if (!accessToken && !clientSecret) return { ok: false, error: 'no_credentials' };

  const url = new URL('https://graph.mapillary.com/images');
  // Mapillary supports access tokens via query param for Graph API calls.
  // Some setups also use `Authorization: OAuth <client_secret>` (per Mapillary docs for token exchange).
  // We support either/both to match what people see in the developer dashboard.
  if (accessToken) url.searchParams.set('access_token', accessToken);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lng));
  url.searchParams.set('radius', String(Math.round(radius)));
  url.searchParams.set('is_pano', 'true');
  url.searchParams.set('fields', 'id,geometry,computed_geometry,thumb_2048_url,compass_angle,computed_compass_angle,captured_at,is_pano');

  const headers = {
    'User-Agent': process.env.MAPILLARY_USER_AGENT || DEFAULT_UA,
    Accept: 'application/json',
  };
  if (clientSecret) {
    // Mapillary examples use `Authorization: OAuth CLIENT_SECRET` for some endpoints.
    headers.Authorization = `OAuth ${clientSecret}`;
  }

  const res = await fetch(url.toString(), { headers });
  const data = await res.json().catch(() => null);
  
  console.log('[mapillary] status:', res.status, 'url:', url.toString().slice(0, 120));
  console.log('[mapillary] response:', JSON.stringify(data).slice(0, 300));
  
  if (!res.ok) return { ok: false, status: res.status, data };
  if (!data || !Array.isArray(data.data) || !data.data.length) return { ok: true, data: null };
  return { ok: true, data: data.data };
}

async function checkMapillaryCoverage({ lat, lng, radii = [1, 50] }) {
  for (const r of radii) {
    // eslint-disable-next-line no-await-in-loop
    const s = await mapillaryImagesSearch({ lat, lng, radius: r, limit: 1 });
    if (!s.ok) return { found: false };
    const img = s.data?.[0];
    if (!img) continue;
    const pos = pointFromImage(img);
    if (!pos) continue;
    return { found: true, lat: pos.lat, lng: pos.lng };
  }
  return { found: false };
}

async function nearestMapillaryImage({ lat, lng, radii = [1, 50] }) {
  for (const r of radii) {
    // eslint-disable-next-line no-await-in-loop
    const s = await mapillaryImagesSearch({ lat, lng, radius: r, limit: 5 });
    if (!s.ok) return { found: false, error: 'request_failed' };
    const imgs = s.data || [];
    for (const img of imgs) {
      const pos = pointFromImage(img);
      const url = img.thumb_2048_url;
      if (!pos || !url) continue;
      return {
        found: true,
        id: img.id,
        lat: pos.lat,
        lng: pos.lng,
        imageUrl: url,
        capturedAt: img.captured_at || null,
        compass: img.computed_compass_angle ?? img.compass_angle ?? null,
      };
    }
  }
  return { found: false };
}

module.exports = { checkMapillaryCoverage, nearestMapillaryImage, mapillaryImagesSearch };
