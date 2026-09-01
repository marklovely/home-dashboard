/**
 * Public provisioning status for a freshly signed-up hub.
 *
 * The marketing success page polls this so buyers watch a live "deploying"
 * state instead of guessing when to retry the hub URL. Provisioning takes
 * roughly ten minutes end to end (registry commit, Terraform, Worker, Pages).
 */

import { getSiteFromManifest } from './platformApi.js';
import { platformHealthServiceAuth } from './platformHealthFetch.js';

export const CUSTOMER_HUB_ZONE_NAME = 'lovely-hub.com';
export const HUB_PROVISION_TYPICAL_MINUTES = 10;
/** Marker present on the hub SPA index — not on an empty Pages project or Access login. */
export const HUB_LIVE_HTML_FINGERPRINT = 'hub-shell';
const PROBE_TIMEOUT_MS = 6000;
/** Existing billing rows may still use underscores; new signups must not. */
const SITE_ID_LOOKUP_RE = /^[a-z][a-z0-9_-]{0,31}$/;

/**
 * @param {string} siteId
 */
export function hubProvisionHostname(siteId) {
  return `${String(siteId).trim().toLowerCase()}.${CUSTOMER_HUB_ZONE_NAME}`;
}

/**
 * @param {string | null | undefined} html
 */
export function hubHtmlLooksLikeLiveHub(html) {
  return typeof html === 'string' && html.includes(HUB_LIVE_HTML_FINGERPRINT);
}

/**
 * A hub counts as live once the hostname returns the hub SPA. Cloudflare Access
 * often answers with a login redirect a few minutes before Pages has actually
 * deployed the app — that is still provisioning. DNS gaps, empty Pages 200s,
 * and origin errors also mean the build is still running.
 *
 * @param {{
 *   status?: number | null,
 *   error?: string | null,
 *   looksLikeHub?: boolean | null
 * } | null} probe
 */
export function hubProbeIsLive(probe) {
  if (!probe || probe.error) return false;
  const status = Number(probe.status);
  if (!Number.isFinite(status) || status < 200 || status >= 300) return false;
  return Boolean(probe.looksLikeHub);
}

/**
 * @param {{
 *   siteId: string,
 *   registered?: boolean,
 *   probe?: {
 *     status?: number | null,
 *     error?: string | null,
 *     looksLikeHub?: boolean | null
 *   } | null,
 *   registryLastError?: string | null,
 *   provisionLastError?: string | null
 * }} input
 */
export function buildHubProvisionStatus(input) {
  const siteId = String(input.siteId ?? '').trim().toLowerCase();
  const hostname = hubProvisionHostname(siteId);
  const probe = input.probe ?? null;
  const ready = hubProbeIsLive(probe);

  const registryLastError = String(input.registryLastError ?? '').trim();
  const provisionLastError = String(input.provisionLastError ?? '').trim();
  const registryFailed = !input.registered && Boolean(registryLastError);
  const failed = !ready && (registryFailed || Boolean(provisionLastError));
  const failureKind = failed ? (siteId.includes('_') ? 'invalid_hostname' : 'setup_failed') : null;

  return {
    siteId,
    hostname,
    hubUrl: `https://${hostname}/`,
    state: ready ? 'ready' : failed ? 'failed' : 'provisioning',
    ready,
    registered: Boolean(input.registered),
    probeStatus: probe && Number.isFinite(Number(probe.status)) ? Number(probe.status) : null,
    looksLikeHub: Boolean(probe?.looksLikeHub),
    typicalMinutes: HUB_PROVISION_TYPICAL_MINUTES,
    failureKind,
    message: hubProvisionMessage({ ready, failed, hostname, siteId })
  };
}

/**
 * @param {{
 *   ready: boolean,
 *   failed: boolean,
 *   hostname: string,
 *   siteId: string
 * }} input
 */
function hubProvisionMessage(input) {
  if (input.ready) return 'Your hub is live — open it and run the setup wizard.';
  if (input.failed && input.siteId.includes('_')) {
    return `We could not create ${input.hostname} because underscores are not allowed in web addresses. Sign up again using hyphens, for example ${input.siteId.replaceAll('_', '-')}.`;
  }
  if (input.failed) {
    return `We could not finish building ${input.hostname}. Email support@lovely-home.co.uk with this address and we will complete it. You have not been charged.`;
  }
  return `We are still building your hub. This usually takes about ${HUB_PROVISION_TYPICAL_MINUTES} minutes.`;
}

/**
 * @param {string} hostname
 * @param {typeof fetch} [fetchImpl]
 * @param {Record<string, string | undefined>} [env]
 * @returns {Promise<{ status: number | null, error: string | null, looksLikeHub: boolean }>}
 */
export async function probeHubHostname(hostname, fetchImpl = fetch, env = {}) {
  const auth = platformHealthServiceAuth(env);
  /** @type {Record<string, string>} */
  const headers = { Accept: 'text/html' };
  if (auth) {
    headers['CF-Access-Client-Id'] = auth.clientId;
    headers['CF-Access-Client-Secret'] = auth.clientSecret;
  }

  /** @type {RequestInit} */
  const init = { method: 'GET', redirect: 'manual', headers };
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    init.signal = AbortSignal.timeout(PROBE_TIMEOUT_MS);
  }

  try {
    const response = await fetchImpl(`https://${hostname}/`, init);
    let looksLikeHub = false;
    if (response.status >= 200 && response.status < 300) {
      const html = await response.text();
      looksLikeHub = hubHtmlLooksLikeLiveHub(html);
    }
    return { status: response.status, error: null, looksLikeHub };
  } catch (error) {
    return {
      status: null,
      error: error instanceof Error ? error.message : 'PROBE_FAILED',
      looksLikeHub: false
    };
  }
}

/**
 * @param {object} manifest
 * @param {string} siteId
 * @param {typeof fetch} [fetchImpl]
 * @param {Record<string, string | undefined>} [env]
 * @param {{
 *   registry_last_error?: string | null,
 *   provision_last_error?: string | null
 * } | null} [billing]
 */
export async function getPublicHubProvisionStatus(
  manifest,
  siteId,
  fetchImpl = fetch,
  env = {},
  billing = null
) {
  const id = String(siteId ?? '').trim().toLowerCase();
  if (!SITE_ID_LOOKUP_RE.test(id)) {
    return { ok: false, status: 400, body: { error: 'INVALID_SITE_ID', message: 'Invalid hub address.' } };
  }

  const probe = await probeHubHostname(hubProvisionHostname(id), fetchImpl, env);
  return {
    ok: true,
    status: 200,
    body: buildHubProvisionStatus({
      siteId: id,
      registered: Boolean(getSiteFromManifest(manifest ?? {}, id)),
      probe,
      registryLastError: billing?.registry_last_error ?? '',
      provisionLastError: billing?.provision_last_error ?? ''
    })
  };
}
