import { requireOwnerForHubSetup } from '../lib/hubSetupAuth.js';
import { clearHouseSettings } from '../lib/houseSettings.js';
import { clearHubSecrets, getHubSecretsStatus, HUB_SECRET_KEYS, setHubSecrets } from '../lib/hubSecrets.js';
import { applySitterStaySchedule } from '../lib/sitterSchedule.js';
import { clearSitterStays } from '../lib/sitterStays.js';
import { getSiteProfile, resetSiteProfile, updateSiteProfile } from '../lib/siteProfile.js';
import { clearGuideCatalog, isHouseGuideSeeded, requireHouseGuideDb } from '../houseGuide/repository.js';
import { jsonError, methodNotAllowed } from '../lib/errors.js';
import { normalizeAppleCalendarFeedUrl } from '../calendar/feedUrl.js';
import { isTestHubWorker } from '../lib/hubEnvironment.js';

/**
 * @param {Record<string, unknown>} body
 */
function validateSecretsPatch(body) {
  /** @type {Partial<Record<(typeof HUB_SECRET_KEYS)[number], string>>} */
  const patch = {};
  for (const key of HUB_SECRET_KEYS) {
    if (body[key] === undefined) continue;
    const value = String(body[key] ?? '').trim();
    if (key === 'owner_pin' && value && !/^\d{4}$/.test(value)) {
      return { ok: false, message: 'Owner PIN must be exactly 4 digits.' };
    }
    if (key === 'calendar_ics_url' && value && !normalizeAppleCalendarFeedUrl(value)) {
      return {
        ok: false,
        message: 'Calendar link must be a valid https or webcal URL (private ICS subscribe link).'
      };
    }
    patch[key] = value;
  }
  return { ok: true, patch };
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
export async function handleSiteProfileGet(request, env, correlationId) {
  if (request.method !== 'GET') return methodNotAllowed(correlationId);

  const ownerGate = await requireOwnerForHubSetup(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  const profile = await getSiteProfile(env);
  const guideSeeded = env.HOUSE_GUIDE_DB ? await isHouseGuideSeeded(env.HOUSE_GUIDE_DB) : false;
  const skipOnboardingFromLegacyGuide =
    guideSeeded &&
    !isTestHubWorker(env) &&
    profile.onboardingComplete !== true;
  const effectiveProfile = skipOnboardingFromLegacyGuide
    ? { ...profile, onboardingComplete: true }
    : profile;
  return Response.json(
    { profile: effectiveProfile, guideSeeded },
    { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
  );
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
export async function handleSiteProfilePatch(request, env, correlationId) {
  if (request.method !== 'PATCH') return methodNotAllowed(correlationId);

  const ownerGate = await requireOwnerForHubSetup(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'BAD_REQUEST', 'Invalid JSON body.', { correlationId });
  }

  if (!body || typeof body !== 'object') {
    return jsonError(400, 'BAD_REQUEST', 'Expected a JSON object.', { correlationId });
  }

  try {
    const profile = await updateSiteProfile(env, body);
    return Response.json({ ok: true, profile }, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  } catch {
    return jsonError(503, 'UNAVAILABLE', 'Could not save site profile.', { correlationId });
  }
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
export async function handleHubSecretsStatusGet(request, env, correlationId) {
  if (request.method !== 'GET') return methodNotAllowed(correlationId);

  const ownerGate = await requireOwnerForHubSetup(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  const stored = await getHubSecretsStatus(env);
  const envFallback = {
    owner_pin: Boolean(env.OWNER_PIN?.trim()),
    wifi_ssid: Boolean(env.PRIVATE_WIFI_SSID?.trim()),
    wifi_password: Boolean(env.PRIVATE_WIFI_PASSWORD?.trim()),
    primary_phone: Boolean(env.PRIVATE_MARK_PHONE?.trim()),
    primary_email: Boolean(env.PRIVATE_MARK_EMAIL?.trim()),
    secondary_phone: Boolean(env.PRIVATE_DONNA_PHONE?.trim()),
    secondary_email: Boolean(env.PRIVATE_DONNA_EMAIL?.trim()),
    home_address: Boolean(env.PRIVATE_HOME_ADDRESS?.trim()),
    lockbox_code: Boolean(env.PRIVATE_LOCKBOX_CODE?.trim()),
    calendar_ics_url: Boolean(env.APPLE_CALENDAR_ICS_URL?.trim())
  };

  /** @type {Record<string, boolean>} */
  const configured = {};
  for (const key of HUB_SECRET_KEYS) {
    configured[key] = Boolean(stored[key] || envFallback[key]);
  }

  return Response.json({ configured, stored }, {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
export async function handleHubSecretsPatch(request, env, correlationId) {
  if (request.method !== 'PATCH') return methodNotAllowed(correlationId);

  const ownerGate = await requireOwnerForHubSetup(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'BAD_REQUEST', 'Invalid JSON body.', { correlationId });
  }

  const validation = validateSecretsPatch(body ?? {});
  if (!validation.ok) {
    return jsonError(400, 'BAD_REQUEST', validation.message ?? 'Invalid secrets.', { correlationId });
  }

  try {
    await setHubSecrets(env, validation.patch);
    const configured = await getHubSecretsStatus(env);
    return Response.json({ ok: true, configured }, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  } catch {
    return jsonError(503, 'UNAVAILABLE', 'Could not save secrets.', { correlationId });
  }
}

/**
 * @param {Record<string, unknown>} env
 */
export async function resetHubToDefaults(env) {
  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  await clearGuideCatalog(db);
  await clearHouseSettings(env);
  await clearHubSecrets(env);
  await clearSitterStays(env);
  const profile = await resetSiteProfile(env);
  try {
    await applySitterStaySchedule(env);
  } catch {
    // Access sync is best-effort — reset must succeed even when CF API is unavailable.
  }
  return { profile, guideSeeded: false };
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
export async function handleSiteResetPost(request, env, correlationId) {
  if (request.method !== 'POST') return methodNotAllowed(correlationId);

  const ownerGate = await requireOwnerForHubSetup(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'BAD_REQUEST', 'Invalid JSON body.', { correlationId });
  }

  if (body?.confirm !== 'RESET') {
    return jsonError(400, 'BAD_REQUEST', 'Send { "confirm": "RESET" } to factory reset this hub.', {
      correlationId
    });
  }

  try {
    const result = await resetHubToDefaults(env);
    return Response.json({ ok: true, ...result }, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  } catch {
    return jsonError(503, 'UNAVAILABLE', 'Could not reset hub.', { correlationId });
  }
}

/**
 * @param {Request} request
 * @param {URL} url
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
export async function handleSiteSetup(request, url, env, correlationId) {
  if (url.pathname === '/api/site/profile') {
    if (request.method === 'GET') return handleSiteProfileGet(request, env, correlationId);
    if (request.method === 'PATCH') return handleSiteProfilePatch(request, env, correlationId);
    return methodNotAllowed(correlationId);
  }

  if (url.pathname === '/api/site/secrets/status') {
    return handleHubSecretsStatusGet(request, env, correlationId);
  }

  if (url.pathname === '/api/site/secrets') {
    if (request.method === 'PATCH') return handleHubSecretsPatch(request, env, correlationId);
    return methodNotAllowed(correlationId);
  }

  if (url.pathname === '/api/site/reset') {
    return handleSiteResetPost(request, env, correlationId);
  }

  return jsonError(404, 'NOT_FOUND', 'Route not found.', { correlationId });
}
