import { fetchHouseSettings, postSitterAccessEmails } from '../api/houseSettingsApi.js';

/** @type {string[] | null} */
let sitterAccessEmails = null;

/** @type {boolean | null} */
let accessSitterSyncConfigured = null;

/** @type {Set<() => void>} */
const listeners = new Set();

/** @param {() => void} listener */
export function subscribeToSitterAccessEmails(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function getSitterAccessEmails() {
  return sitterAccessEmails;
}

export function isAccessSitterSyncConfigured() {
  return accessSitterSyncConfigured === true;
}

/**
 * @param {string[] | null | undefined} emails
 * @param {boolean | undefined} syncConfigured
 */
export function applySitterAccessEmails(emails, syncConfigured) {
  const next = Array.isArray(emails) ? emails : [];
  const changed =
    JSON.stringify(sitterAccessEmails) !== JSON.stringify(next) ||
    accessSitterSyncConfigured !== (syncConfigured === true);
  sitterAccessEmails = next;
  accessSitterSyncConfigured = syncConfigured === true;
  if (changed) notify();
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export async function syncSitterAccessEmailsFromServer(fetchImpl = fetch) {
  const result = await fetchHouseSettings(fetchImpl);
  if (!result.ok) {
    return false;
  }
  applySitterAccessEmails(result.data.sitterAccessEmailsManual ?? result.data.sitterAccessEmails, result.data.accessSitterSyncConfigured);
  return true;
}

/**
 * @param {string[]} emails
 * @param {typeof fetch} [fetchImpl]
 */
export async function saveSitterAccessEmails(emails, fetchImpl = fetch) {
  const result = await postSitterAccessEmails(emails, fetchImpl);
  if (!result.ok) {
    return {
      ok: false,
      status: result.status,
      message: result.data?.accessSyncMessage ?? 'Could not save sitter emails.'
    };
  }
  applySitterAccessEmails(result.data.sitterAccessEmailsManual ?? result.data.sitterAccessEmails, result.data.accessSitterSyncConfigured);
  if (result.data.accessSyncOk === false) {
    return {
      ok: false,
      status: result.data.accessSyncError === 'ACCESS_SYNC_NOT_CONFIGURED' ? 200 : 502,
      message:
        result.data.accessSyncError === 'ACCESS_SYNC_NOT_CONFIGURED'
          ? 'Saved on the hub, but Cloudflare Access sync is not configured on the Worker yet.'
          : result.data.accessSyncMessage ?? 'Saved locally but Cloudflare Access sync failed.'
    };
  }
  return { ok: true };
}

/** @internal */
export function resetSitterAccessEmailsForTests() {
  sitterAccessEmails = null;
  accessSitterSyncConfigured = null;
  listeners.clear();
}
