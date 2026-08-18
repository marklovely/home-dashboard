import { parseEmailList, validateEmailList } from '../../lib/emailLists.js';

const SITE_ID_RE = /^[a-z][a-z0-9_-]{0,31}$/;
const HOSTNAME_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
const PROTECTED_SITE_IDS = new Set(['production']);

/**
 * @param {string} siteId
 */
function validateSiteId(siteId) {
  const id = String(siteId ?? '').trim();
  if (!id) return 'Site id is required.';
  if (!SITE_ID_RE.test(id)) {
    return 'Site id must start with a letter and use lowercase letters, numbers, hyphens, or underscores (max 32 chars).';
  }
  return null;
}

/**
 * @param {string} hostname
 * @param {string} zoneName
 */
function validateHostname(hostname, zoneName) {
  const host = String(hostname ?? '').trim().toLowerCase();
  if (!host) return 'Hostname is required.';
  if (!HOSTNAME_RE.test(host)) return 'Hostname must be a valid DNS name.';
  if (!host.endsWith(`.${zoneName}`) && host !== zoneName) {
    return `Hostname must be under ${zoneName}.`;
  }
  return null;
}

/**
 * @param {string} siteId
 * @param {Record<string, unknown>} payload
 * @param {string} zoneName
 */
function defaultSiteEntry(siteId, payload, zoneName) {
  const hostname =
    (payload.hostname ? String(payload.hostname) : '') ||
    (siteId === 'production' ? `dashboard.${zoneName}` : `${siteId}.${zoneName}`);
  return {
    hostname,
    hub_environment: (payload.hub_environment ? String(payload.hub_environment) : '') || siteId,
    vanilla: payload.vanilla !== false,
    terraform: payload.terraform !== false,
    attach_hub_api_binding: payload.attach_hub_api_binding === true
  };
}

/**
 * @param {object} manifest
 * @param {string} action
 * @param {string} siteId
 * @param {Record<string, unknown>} body
 */
export function buildSiteManagePayload(manifest, action, siteId, body) {
  const zoneName = manifest.platform?.zoneName ?? 'lovely-home.co.uk';
  /** @type {Record<string, Record<string, string | boolean>>} */
  const existing = {};

  for (const [id, site] of Object.entries(manifest.sites ?? {})) {
    existing[id] = {
      hostname: String(site.hostname ?? ''),
      hub_environment: String(site.hubEnvironment ?? id),
      vanilla: Boolean(site.vanilla),
      terraform: site.terraform !== false,
      ...(Array.isArray(site.ownerEmails) && site.ownerEmails.length
        ? { owner_emails: site.ownerEmails }
        : {}),
      ...(Array.isArray(site.sitterEmails) && site.sitterEmails.length
        ? { sitter_emails: site.sitterEmails }
        : {})
    };
  }

  const idError = validateSiteId(siteId);
  if (idError) return { ok: false, error: 'VALIDATION_ERROR', message: idError };

  /** @type {Record<string, unknown>} */
  const payload = {
    siteId,
    ...(body.hostname !== undefined ? { hostname: String(body.hostname) } : {}),
    ...(body.hubEnvironment !== undefined ? { hub_environment: String(body.hubEnvironment) } : {}),
    ...(body.hub_environment !== undefined ? { hub_environment: String(body.hub_environment) } : {}),
    ...(body.vanilla !== undefined ? { vanilla: Boolean(body.vanilla) } : {}),
    ...(body.terraform !== undefined ? { terraform: Boolean(body.terraform) } : {}),
    ...(body.attachHubApiBinding !== undefined
      ? { attach_hub_api_binding: Boolean(body.attachHubApiBinding) }
      : {}),
    ...(body.attach_hub_api_binding !== undefined
      ? { attach_hub_api_binding: Boolean(body.attach_hub_api_binding) }
      : {}),
    ...(body.ownerEmails !== undefined || body.owner_emails !== undefined
      ? { owner_emails: parseEmailList(body.ownerEmails ?? body.owner_emails) }
      : {}),
    ...(body.sitterEmails !== undefined || body.sitter_emails !== undefined
      ? { sitter_emails: parseEmailList(body.sitterEmails ?? body.sitter_emails) }
      : {})
  };

  if (action === 'create') {
    if (existing[siteId]) {
      return { ok: false, error: 'VALIDATION_ERROR', message: `Site "${siteId}" already exists.` };
    }
    Object.assign(payload, defaultSiteEntry(siteId, payload, zoneName));
    const hostError = validateHostname(String(payload.hostname), zoneName);
    if (hostError) return { ok: false, error: 'VALIDATION_ERROR', message: hostError };
    const ownerError = validateEmailList(payload.owner_emails, { required: true });
    if (ownerError) return { ok: false, error: 'VALIDATION_ERROR', message: ownerError };
    const sitterError = validateEmailList(payload.sitter_emails);
    if (sitterError) return { ok: false, error: 'VALIDATION_ERROR', message: sitterError };
  } else if (action === 'update') {
    if (!existing[siteId]) {
      return { ok: false, error: 'VALIDATION_ERROR', message: `Site "${siteId}" is not in the registry.` };
    }
    if (payload.hostname !== undefined) {
      const hostError = validateHostname(String(payload.hostname), zoneName);
      if (hostError) return { ok: false, error: 'VALIDATION_ERROR', message: hostError };
    }
    if (payload.owner_emails !== undefined) {
      const ownerError = validateEmailList(payload.owner_emails, { required: true });
      if (ownerError) return { ok: false, error: 'VALIDATION_ERROR', message: ownerError };
    }
    const sitterError = validateEmailList(payload.sitter_emails);
    if (sitterError) return { ok: false, error: 'VALIDATION_ERROR', message: sitterError };
  } else if (action === 'delete') {
    if (!existing[siteId]) {
      return { ok: false, error: 'VALIDATION_ERROR', message: `Site "${siteId}" is not in the registry.` };
    }
    if (PROTECTED_SITE_IDS.has(siteId)) {
      return {
        ok: false,
        error: 'VALIDATION_ERROR',
        message: `Site "${siteId}" is protected and cannot be deleted from the platform UI.`
      };
    }
    const expected = existing[siteId]?.hostname;
    const confirm = String(body.confirmHostname ?? '').trim();
    if (!confirm || confirm !== expected) {
      return {
        ok: false,
        error: 'CONFIRMATION_REQUIRED',
        message: `Type the hostname "${expected}" to confirm deletion.`
      };
    }
    payload.confirm_hostname = confirm;
  } else {
    return { ok: false, error: 'VALIDATION_ERROR', message: 'Unknown action.' };
  }

  return { ok: true, payload };
}

/**
 * @param {string} siteId
 * @param {object} manifest
 */
export function validateSiteProvision(siteId, manifest) {
  const idError = validateSiteId(siteId);
  if (idError) {
    return { ok: false, error: 'VALIDATION_ERROR', message: idError };
  }

  if (PROTECTED_SITE_IDS.has(siteId)) {
    return {
      ok: false,
      error: 'VALIDATION_ERROR',
      message: 'Production provisioning is not supported via the platform UI.'
    };
  }

  if (!manifest.sites?.[siteId]) {
    return { ok: false, error: 'NOT_FOUND', message: `Unknown site: ${siteId}` };
  }

  return { ok: true };
}

/**
 * @param {string} siteId
 * @param {object} manifest
 */
export function validateSiteDeploy(siteId, manifest) {
  const idError = validateSiteId(siteId);
  if (idError) {
    return { ok: false, error: 'VALIDATION_ERROR', message: idError };
  }

  if (PROTECTED_SITE_IDS.has(siteId)) {
    return {
      ok: false,
      error: 'VALIDATION_ERROR',
      message: 'Production worker deploy is not supported via the platform UI.'
    };
  }

  if (!manifest.sites?.[siteId]) {
    return { ok: false, error: 'NOT_FOUND', message: `Unknown site: ${siteId}` };
  }

  return { ok: true };
}

/**
 * @param {object} manifest
 */
export function siteWizardSchema(manifest) {
  const zoneName = manifest.platform?.zoneName ?? 'lovely-home.co.uk';
  return {
    zoneName,
    protectedSiteIds: [...PROTECTED_SITE_IDS],
    existingSiteIds: Object.keys(manifest.sites ?? {}),
    defaults: {
      vanilla: true,
      terraform: true,
      attachHubApiBinding: false
    }
  };
}
