const SITTER_SECRETS_KEY = 'sitter_secrets_disclosed';
const SITTER_ACCESS_EMAILS_KEY = 'sitter_access_emails';

/**
 * @param {Record<string, string | undefined>} env
 */
export async function clearHouseSettings(env) {
  const db = requireHouseSettingsDb(env.HOUSE_GUIDE_DB);
  await db.prepare(`DELETE FROM house_settings`).run();
}

/**
 * @param {D1Database | undefined} db
 */
function requireHouseSettingsDb(db) {
  if (!db) {
    throw new Error('HOUSE_GUIDE_DB is not configured');
  }
  return db;
}

/**
 * @param {Record<string, string | undefined>} env
 */
export async function getSitterSecretsManual(env) {
  const db = env.HOUSE_GUIDE_DB;
  if (!db) {
    return env.SITTER_SECRETS_DISCLOSED?.trim() === '1';
  }

  const row = await db
    .prepare('SELECT value FROM house_settings WHERE key = ?')
    .bind(SITTER_SECRETS_KEY)
    .first();
  return row?.value === '1';
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {boolean} disclosed
 */
/** @deprecated Use getSitterSecretsManual — stored owner toggle, not schedule-effective. */
export const getSitterSecretsDisclosed = getSitterSecretsManual;

export async function setSitterSecretsManual(env, disclosed) {
  const db = requireHouseSettingsDb(env.HOUSE_GUIDE_DB);
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO house_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .bind(SITTER_SECRETS_KEY, disclosed ? '1' : '0', now)
    .run();
}

/** @deprecated Use setSitterSecretsManual */
export const setSitterSecretsDisclosed = setSitterSecretsManual;

/**
 * @param {Record<string, string | undefined>} env
 * @returns {Promise<string[] | null>}
 */
export async function getSitterAccessEmailsRaw(env) {
  const db = env.HOUSE_GUIDE_DB;
  if (!db) return null;

  const row = await db
    .prepare('SELECT value FROM house_settings WHERE key = ?')
    .bind(SITTER_ACCESS_EMAILS_KEY)
    .first();
  if (row?.value == null) return null;

  try {
    const parsed = JSON.parse(String(row.value));
    return Array.isArray(parsed) ? parsed.map((email) => String(email).trim().toLowerCase()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string[]} emails
 */
export async function setSitterAccessEmails(env, emails) {
  const db = requireHouseSettingsDb(env.HOUSE_GUIDE_DB);
  const now = Math.floor(Date.now() / 1000);
  const normalized = emails.map((email) => String(email).trim().toLowerCase()).filter(Boolean);
  await db
    .prepare(
      `INSERT INTO house_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .bind(SITTER_ACCESS_EMAILS_KEY, JSON.stringify(normalized), now)
    .run();
}
