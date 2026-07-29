/** In-memory owner API bearer token (never persisted). */

/** @type {string | null} */
let accessToken = null;

/** @type {number | null} */
let expiresAtMs = null;

/**
 * @param {string} token
 * @param {string} expiresAtIso
 */
export function setOwnerAccessToken(token, expiresAtIso) {
  accessToken = token;
  expiresAtMs = Date.parse(expiresAtIso);
}

export function getOwnerAccessToken() {
  if (!accessToken || !expiresAtMs) return null;
  if (Date.now() >= expiresAtMs) {
    clearOwnerAccessToken();
    return null;
  }
  return accessToken;
}

export function clearOwnerAccessToken() {
  accessToken = null;
  expiresAtMs = null;
}

/** @internal */
export function resetOwnerAccessTokenForTests() {
  clearOwnerAccessToken();
}
