/**
 * Owner-configured LAN camera streams (go2rtc gateway + stream names).
 */

/**
 * @typedef {Object} CameraStreamProfile
 * @property {string} id Stable id for UI (slug)
 * @property {string} label Display name
 * @property {string} src go2rtc stream name (matches go2rtc.yaml)
 * @property {boolean} [primary] Emphasise on the home tile / first tile
 */

/**
 * @typedef {Object} CamerasProfile
 * @property {boolean} enabled
 * @property {string} gatewayUrl Base URL for go2rtc (HTTPS when hub uses HTTPS)
 * @property {CameraStreamProfile[]} streams
 */

export const DEFAULT_CAMERAS_PROFILE = /** @type {CamerasProfile} */ ({
  enabled: false,
  gatewayUrl: '',
  streams: []
});

/**
 * @param {unknown} value
 * @returns {CameraStreamProfile | null}
 */
function normalizeStream(value) {
  if (!value || typeof value !== 'object') return null;
  const row = /** @type {Record<string, unknown>} */ (value);
  const id = String(row.id ?? '').trim();
  const label = String(row.label ?? '').trim();
  const src = String(row.src ?? '').trim();
  if (!id || !label || !src) return null;
  return {
    id,
    label,
    src,
    primary: row.primary === true
  };
}

/**
 * @param {unknown} value
 * @returns {CamerasProfile}
 */
export function normalizeCamerasProfile(value) {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_CAMERAS_PROFILE, streams: [] };
  }
  const row = /** @type {Record<string, unknown>} */ (value);
  const streams = Array.isArray(row.streams)
    ? row.streams.map(normalizeStream).filter(Boolean)
    : [];
  return {
    enabled: row.enabled === true,
    gatewayUrl: String(row.gatewayUrl ?? '').trim(),
    streams: /** @type {CameraStreamProfile[]} */ (streams)
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} profile
 * @returns {CamerasProfile}
 */
export function readCamerasFromProfile(profile) {
  return normalizeCamerasProfile(profile?.cameras);
}

/**
 * @param {CamerasProfile} cameras
 * @returns {boolean}
 */
export function isCamerasConfigured(cameras) {
  return Boolean(
    cameras.enabled &&
      cameras.gatewayUrl &&
      cameras.streams.length > 0 &&
      cameras.streams.every((stream) => stream.src)
  );
}

/**
 * @param {string} gatewayUrl
 * @param {string} src go2rtc stream name
 * @param {'webrtc' | 'mse'} [mode]
 * @returns {string | null}
 */
export function buildGo2RtcPlayerUrl(gatewayUrl, src, mode = 'webrtc') {
  const base = gatewayUrl.trim().replace(/\/$/, '');
  const stream = src.trim();
  if (!base || !stream) return null;
  try {
    const url = new URL(base);
    url.pathname = `${url.pathname.replace(/\/$/, '')}/stream.html`;
    url.search = '';
    url.searchParams.set('src', stream);
    url.searchParams.set('mode', mode);
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Sort streams with primary first, then label.
 * @param {CameraStreamProfile[]} streams
 */
export function sortCameraStreams(streams) {
  return [...streams].sort((left, right) => {
    if (left.primary !== right.primary) {
      return left.primary ? -1 : 1;
    }
    return left.label.localeCompare(right.label);
  });
}
