export const DEFAULT_SITE_PROFILE = {
  onboardingComplete: false,
  hubName: '',
  useCase: 'owner',
  primaryContact: { name: '', phone: '', email: '' },
  secondaryContact: { name: '', phone: '', email: '' },
  petCare: {
    hasPets: false,
    name: '',
    species: '',
    age: '',
    temperament: '',
    feeding: '',
    walks: '',
    vet: '',
    vetPhone: '',
    vetEmergency: ''
  }
};

/**
 * @param {unknown} value
 */
function parseProfilePayload(value) {
  if (!value) return { ...DEFAULT_SITE_PROFILE };
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_SITE_PROFILE };
    return {
      ...DEFAULT_SITE_PROFILE,
      ...parsed,
      primaryContact: { ...DEFAULT_SITE_PROFILE.primaryContact, ...parsed.primaryContact },
      secondaryContact: { ...DEFAULT_SITE_PROFILE.secondaryContact, ...parsed.secondaryContact },
      petCare: { ...DEFAULT_SITE_PROFILE.petCare, ...parsed.petCare }
    };
  } catch {
    return { ...DEFAULT_SITE_PROFILE };
  }
}

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
 */
export async function hasSiteProfileRow(env) {
  const db = env.HOUSE_GUIDE_DB;
  if (!db) return false;
  const row = await db.prepare(`SELECT id FROM site_profile WHERE id = ?`).bind('default').first();
  return Boolean(row);
}

/**
 * @param {Record<string, string | undefined>} env
 */
export async function getSiteProfile(env) {
  const db = env.HOUSE_GUIDE_DB;
  if (!db) return { ...DEFAULT_SITE_PROFILE };

  const row = await db.prepare(`SELECT payload FROM site_profile WHERE id = ?`).bind('default').first();
  return parseProfilePayload(row?.payload);
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {Record<string, unknown>} patch
 */
export async function updateSiteProfile(env, patch) {
  const db = requireHubDb(env.HOUSE_GUIDE_DB);
  const current = await getSiteProfile(env);
  const next = {
    ...current,
    ...patch,
    primaryContact: patch.primaryContact
      ? { ...current.primaryContact, ...patch.primaryContact }
      : current.primaryContact,
    secondaryContact: patch.secondaryContact
      ? { ...current.secondaryContact, ...patch.secondaryContact }
      : current.secondaryContact,
    petCare: patch.petCare ? { ...current.petCare, ...patch.petCare } : current.petCare
  };

  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO site_profile (id, payload, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`
    )
    .bind('default', JSON.stringify(next), now)
    .run();

  return next;
}

/**
 * @param {Record<string, string | undefined>} env
 */
export async function resetSiteProfile(env) {
  const db = requireHubDb(env.HOUSE_GUIDE_DB);
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO site_profile (id, payload, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`
    )
    .bind('default', JSON.stringify(DEFAULT_SITE_PROFILE), now)
    .run();
  return { ...DEFAULT_SITE_PROFILE };
}
