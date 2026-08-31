/**
 * Public provisioning status for a freshly signed-up hub.
 *
 * The marketing success page polls this so buyers watch a live "deploying"
 * state instead of guessing when to retry the hub URL. Provisioning takes
 * roughly ten minutes end to end (registry commit, Terraform, Worker, Pages).
 */

import { validateBillingSiteId } from './platformBilling.js';
import { getSiteFromManifest } from './platformApi.js';

export const CUSTOMER_HUB_ZONE_NAME = 'lovely-hub.com';
export const HUB_PROVISION_TYPICAL_MINUTES = 10;
const PROBE_TIMEOUT_MS = 6000;

/**
 * @param {string} siteId
 */
export function hubProvisionHostname(siteId) {
  return `${String(siteId).trim().toLowerCase()}.${CUSTOMER_HUB_ZONE_NAME}`;
}

/**
 * A hub counts as live once its hostname answers over HTTPS. Cloudflare Access
 * redirects (3xx) and challenges (401/403) are healthy answers — the buyer is
 * meant to sign in next. DNS gaps, "nothing here yet" 404s from an unattached
 * Pages domain, and origin errors mean provisioning is still running.
 *
 * @param {{ status?: number | null, error?: string | null }} probe
 */
export function hubProbeIsLive(probe) {
  if (!probe || probe.error) return false;
  const status = Number(probe.status);
  if (!Number.isFinite(status) || status <= 0) return false;
  if (status === 401 || status === 403) return true;
  return status < 400;
}

/**
 * @param {{
 *   siteId: string,
 *   registered?: boolean,
 *   probe?: { status?: number | null, error?: string | null } | null
 * }} input
 */
export function buildHubProvisionStatus(input) {
  const siteId = String(input.siteId ?? '').trim().toLowerCase();
  const hostname = hubProvisionHostname(siteId);
  const probe = input.probe ?? null;
  const ready = hubProbeIsLive(probe);

  return {
    siteId,
    hostname,
    hubUrl: `https://${hostname}/`,
    state: ready ? 'ready' : 'provisioning',
    ready,
    registered: Boolean(input.registered),
    probeStatus: probe && Number.isFinite(Number(probe.status)) ? Number(probe.status) : null,
    typicalMinutes: HUB_PROVISION_TYPICAL_MINUTES,
    message: ready
      ? 'Your hub is live — open it and run the setup wizard.'
      : `We are still building your hub. This usually takes about ${HUB_PROVISION_TYPICAL_MINUTES} minutes.`
  };
}

/**
 * @param {string} hostname
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ status: number | null, error: string | null }>}
 */
export async function probeHubHostname(hostname, fetchImpl = fetch) {
  /** @type {RequestInit} */
  const init = { method: 'GET', redirect: 'manual', headers: { Accept: 'text/html' } };
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    init.signal = AbortSignal.timeout(PROBE_TIMEOUT_MS);
  }

  try {
    const response = await fetchImpl(`https://${hostname}/`, init);
    return { status: response.status, error: null };
  } catch (error) {
    return { status: null, error: error instanceof Error ? error.message : 'PROBE_FAILED' };
  }
}

/**
 * @param {object} manifest
 * @param {string} siteId
 * @param {typeof fetch} [fetchImpl]
 */
export async function getPublicHubProvisionStatus(manifest, siteId, fetchImpl = fetch) {
  const id = String(siteId ?? '').trim().toLowerCase();
  const idError = validateBillingSiteId(id);
  if (idError) {
    return { ok: false, status: 400, body: { error: 'INVALID_SITE_ID', message: idError } };
  }

  const probe = await probeHubHostname(hubProvisionHostname(id), fetchImpl);
  return {
    ok: true,
    status: 200,
    body: buildHubProvisionStatus({
      siteId: id,
      registered: Boolean(getSiteFromManifest(manifest ?? {}, id)),
      probe
    })
  };
}
