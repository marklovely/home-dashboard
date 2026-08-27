export const DEFAULT_SITE_PROFILE = {
  onboardingComplete: false,
  hubName: '',
  hubCountryCode: 'GB',
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
  },
  propertyAddress: {
    line1: '',
    line2: '',
    line3: '',
    city: '',
    county: '',
    country: '',
    postcode: ''
  },
  binSchedule: {
    collectionLocation: '',
    councilUrl: '',
    validFrom: '',
    validUntil: '',
    normalCollectionDay: '',
    household: [],
    gardenWaste: [],
    alertHoursBefore: 24
  },
  cameras: {
    enabled: false,
    gatewayUrl: '',
    streams: []
  },
  tabletPreferences: {
    theme: 'dark',
    clockFormat: '24',
    homeScreenScale: '1',
    screensaver: 'on',
    screensaverTimeoutMinutes: 15,
    dismissedBinCollectionDate: null
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
      petCare: { ...DEFAULT_SITE_PROFILE.petCare, ...parsed.petCare },
      propertyAddress: { ...DEFAULT_SITE_PROFILE.propertyAddress, ...parsed.propertyAddress },
      binSchedule: {
        ...DEFAULT_SITE_PROFILE.binSchedule,
        ...(parsed.binSchedule && typeof parsed.binSchedule === 'object' ? parsed.binSchedule : {})
      },
      cameras: {
        ...DEFAULT_SITE_PROFILE.cameras,
        ...(parsed.cameras && typeof parsed.cameras === 'object' ? parsed.cameras : {}),
        streams: Array.isArray(parsed.cameras?.streams) ? parsed.cameras.streams : []
      },
      tabletPreferences: {
        ...DEFAULT_SITE_PROFILE.tabletPreferences,
        ...(parsed.tabletPreferences && typeof parsed.tabletPreferences === 'object'
          ? parsed.tabletPreferences
          : {})
      }
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
 * Public hub branding safe for any authenticated device session (owner or sitter).
 *
 * @param {Record<string, string | undefined>} env
 */
export async function getPublicHubBranding(env) {
  const profile = await getSiteProfile(env);
  const hubName = String(profile.hubName ?? '').trim();
  return hubName ? { hubName } : {};
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
    petCare: patch.petCare ? { ...current.petCare, ...patch.petCare } : current.petCare,
    propertyAddress: patch.propertyAddress
      ? { ...current.propertyAddress, ...patch.propertyAddress }
      : current.propertyAddress,
    binSchedule: patch.binSchedule
      ? { ...current.binSchedule, ...patch.binSchedule }
      : current.binSchedule,
    cameras: patch.cameras
      ? {
          ...current.cameras,
          ...patch.cameras,
          streams: Array.isArray(patch.cameras.streams)
            ? patch.cameras.streams
            : current.cameras.streams
        }
      : current.cameras,
    tabletPreferences: patch.tabletPreferences
      ? { ...current.tabletPreferences, ...patch.tabletPreferences }
      : current.tabletPreferences
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
