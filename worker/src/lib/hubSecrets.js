/** @typedef {'owner_pin' | 'wifi_ssid' | 'wifi_password' | 'primary_phone' | 'primary_email' | 'secondary_phone' | 'secondary_email' | 'home_address' | 'lockbox_code'} HubSecretKey */

export const HUB_SECRET_KEYS = /** @type {const} */ ([
  'owner_pin',
  'wifi_ssid',
  'wifi_password',
  'primary_phone',
  'primary_email',
  'secondary_phone',
  'secondary_email',
  'home_address',
  'lockbox_code'
]);

/** @internal Persisted when OWNER_SESSION_SECRET is not configured via wrangler. */
export const DEVICE_SESSION_SECRET_KEY = 'device_session_secret';

/**
 * @param {D1Database | undefined} db
 */
function requireHubDb(db) {
  if (!db) {
    throw new Error('HOUSE_GUIDE_DB is not configured');
  }
  return db;
}

/**
 * @param {Record<string, string | undefined>} env
 * @returns {Promise<Record<string, string>>}
 */
export async function getHubSecretsMap(env) {
  const db = env.HOUSE_GUIDE_DB;
  if (!db) return {};

  const result = await db.prepare(`SELECT key, value FROM hub_secrets`).bind().all();
  /** @type {Record<string, string>} */
  const map = {};
  for (const row of result.results ?? []) {
    map[String(row.key)] = String(row.value);
  }
  return map;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {HubSecretKey} key
 */
export async function getHubSecret(env, key) {
  const map = await getHubSecretsMap(env);
  return map[key]?.trim() || '';
}

/**
 * @param {Record<string, string | undefined>} env
 */
export async function getHubSecretsStatus(env) {
  const map = await getHubSecretsMap(env);
  /** @type {Record<string, boolean>} */
  const status = {};
  for (const key of HUB_SECRET_KEYS) {
    status[key] = Boolean(map[key]?.trim());
  }
  return status;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {Partial<Record<HubSecretKey, string>>} patch
 */
export async function setHubSecrets(env, patch) {
  const db = requireHubDb(env.HOUSE_GUIDE_DB);
  const now = Math.floor(Date.now() / 1000);

  for (const [key, rawValue] of Object.entries(patch)) {
    if (!HUB_SECRET_KEYS.includes(/** @type {HubSecretKey} */ (key))) continue;
    const value = String(rawValue ?? '').trim();
    if (!value) {
      await db.prepare(`DELETE FROM hub_secrets WHERE key = ?`).bind(key).run();
      continue;
    }
    await db
      .prepare(
        `INSERT INTO hub_secrets (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .bind(key, value, now)
      .run();
  }
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} key
 * @param {string} value
 */
async function setInternalHubSecret(env, key, value) {
  const db = requireHubDb(env.HOUSE_GUIDE_DB);
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO hub_secrets (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .bind(key, value, now)
    .run();
}

/**
 * @param {number} [byteLength]
 */
function generateRandomSecret(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Auto-provision a signing secret on the hub when wrangler secrets are not set.
 *
 * @param {Record<string, string | undefined>} env
 */
export async function getOrCreateDeviceSessionSecret(env) {
  const db = env.HOUSE_GUIDE_DB;
  if (!db) return '';

  const map = await getHubSecretsMap(env);
  const existing = map[DEVICE_SESSION_SECRET_KEY]?.trim();
  if (existing) return existing;

  const secret = generateRandomSecret();
  await setInternalHubSecret(env, DEVICE_SESSION_SECRET_KEY, secret);
  return secret;
}

/**
 * @param {Record<string, string | undefined>} env
 */
export async function clearHubSecrets(env) {
  const db = requireHubDb(env.HOUSE_GUIDE_DB);
  await db.prepare(`DELETE FROM hub_secrets`).run();
}

/**
 * @param {Record<string, string | undefined>} env
 */
export async function getConfiguredOwnerPin(env) {
  const fromDb = await getHubSecret(env, 'owner_pin');
  if (fromDb) return fromDb;
  return env.OWNER_PIN?.trim() || '';
}
